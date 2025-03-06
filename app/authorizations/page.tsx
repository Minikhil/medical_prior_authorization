"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useRouter } from 'next/navigation'
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { ChevronDown, Download, Plus, Search, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Auth, EditableAuth, AuthStatus } from "@/app/types";

Amplify.configure(outputs);

const dynamoDbClient = generateClient<Schema>();

export default function App() {
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuth, setSelectedAuth] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");

  const [editingAuth, setEditingAuth] = useState<EditableAuth | null>(null);

  const [codesModified, setCodesModified] = useState(false);
  const [codesValidated, setCodesValidated] = useState(false);

  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    explanation: string;
    suggestedChanges?: string;
    confidence: string;
  } | null>(null);

  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);

  const [isValidating, setIsValidating] = useState(false);

  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  const getStatusColor = (status: AuthStatus) => {
    switch (status) {
      case AuthStatus.COMPLETED:
        return "bg-green-100 text-green-800"
      case AuthStatus.SUBMITTED:
        return "bg-blue-100 text-blue-800"
      case AuthStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case AuthStatus.REJECTED:
        return "bg-red-100 text-red-800"
      case AuthStatus.CANCELLED:
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredAuthorizations = authorizations.filter((auth) => {
    return statusFilter === "all" || auth.status.toLowerCase() === statusFilter.toLowerCase();
  });

  async function getAuthorizations() {
    try {
      setLoading(true);
      dynamoDbClient.models.PriorAuthorizations.observeQuery().subscribe({
        next: (data) => {
          console.log('Fetched authorizations:', data.items);
          setAuthorizations([...data.items]);
        },
        error: (error) => {
          console.error('Error in subscription:', error);
        }
      });
    } catch (error) {
      console.error("Error fetching authorizations:", error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch authorizations when page loads
  useEffect(() => {
    getAuthorizations();
  }, []);

  const handleAuthUpdate = (changes: Auth) => {
    if (!selectedAuth || !editingAuth) return;
    
    if (changes.icdCodes || changes.cptCodes) {
      setCodesModified(true);
      setCodesValidated(false);
    }

    setEditingAuth(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...changes,
        icdCodes: Array.isArray(changes.icdCodes) ? changes.icdCodes : prev.icdCodes,
        cptCodes: Array.isArray(changes.cptCodes) ? changes.cptCodes : prev.cptCodes
      };
    });

    setSelectedAuth(prev => ({
      ...prev,
      ...changes
    }));
  };

  const handleValidateCodes = async () => {
    try {
      if (!editingAuth) return;

      setIsValidating(true);
      setValidationResults(null);

      // Send the ICD codes to Ragie API to get back related text chunks from medical guidelines
      const ragieResponse = await fetch('/api/getMedicalGuidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: editingAuth.icdCodes.join(' ') }), //Convert ICD codes array to a string query
      });

      if (!ragieResponse.ok) {
        throw new Error(`Failed to call Ragie API: ${ragieResponse.statusText}`);
      }

      // Extract the JSON response from Ragie
      const ragieResponseData = await ragieResponse.json();
      const ragieResponseChunkText = ragieResponseData.scored_chunks.map((chunk) => chunk.text);
      console.log('Ragie Response:', ragieResponseChunkText);

      // Call validation API
      const response = await fetch('/api/validateCodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icdCodes: editingAuth.icdCodes,
          cptCodes: editingAuth.cptCodes,
          cptCodesExplanation: editingAuth.cptCodesExplanation,
          medicalGuideLines: ragieResponseChunkText,
        }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const validationResult = await response.json();
      
      // Update validation results state
      setValidationResults(validationResult);
      if (validationResult.isValid) {
        setCodesValidated(true);
        // Update editingAuth with the validation explanation
        setEditingAuth(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            cptCodesExplanation: validationResult.explanation
          };
        });
      }

    } catch (error) {
      console.error('Validation error:', error);
      setValidationResults({
        isValid: false,
        explanation: 'Failed to validate codes. Please try again.',
        confidence: 'low'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (!selectedAuth || !editingAuth) return;
      
      const isOverride = validationResults?.isValid === false && overrideAcknowledged;

      const { data: updated, errors } = await dynamoDbClient.models.PriorAuthorizations.update({
        id: selectedAuth.id,
        patientName: editingAuth.patientName,
        patientDateOfBirth: editingAuth.patientDateOfBirth,
        status: selectedAuth.status,
        icdCodes: JSON.stringify(editingAuth.icdCodes),
        cptCodes: JSON.stringify(editingAuth.cptCodes),
        cptCodesExplanation: validationResults?.isValid ? editingAuth.cptCodesExplanation : selectedAuth.cptCodesExplanation,
        overrideExplanation: isOverride ? editingAuth.cptCodesExplanation : "",
        isOverride: isOverride,
      });

      if (errors) {
        throw new Error('Failed to update authorization');
      }

      // Update local state and close dialog
      setAuthorizations(prev => 
        prev.map(auth => auth.id === selectedAuth.id ? updated : auth)
      );
      setIsUpdateDialogOpen(false);
      setSelectedAuth(null);
      setEditingAuth(null);
      
    } catch (error) {
      console.error("Error updating authorization:", error);
      alert('Failed to update. Please try again.');
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("Selected file:", file.name);

    try {
      setIsProcessingUpload(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/getPdfText', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }

      const dataPdf = await response.json();
      console.log('API Response:', dataPdf);

      // Send the extracted text to OpenAI API
      const responseOpenai = await fetch('/api/getInitialAuthInfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfText: dataPdf.text }),
      });

      if (!responseOpenai.ok) {
        throw new Error(`Failed to process PDF with OpenAI: ${responseOpenai.statusText}`);
      }

      const dataOpenai = await responseOpenai.json();
      console.log('OpenAI Response:', dataOpenai);

      
      // Validate required fields from OpenAI response
      if (!dataOpenai.patient_name || !dataOpenai.patient_dob) {
        throw new Error('Required patient information not found in the document');
      }

      // Send the extracted text medical plan to Ragie API with query 
      const responseRagie = await fetch('/api/getMedicalGuidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: dataOpenai.medical_plan }),
      });

      if (!responseRagie.ok) {
        throw new Error(`Failed to call Ragie API: ${responseRagie.statusText}`);
      }

      // Extract the JSON response from Ragie
      const ragieData = await responseRagie.json();
      const chunkText = ragieData.scored_chunks.map((chunk) => chunk.text);
      console.log('Ragie Response:', chunkText);

      const getCptCodesResponse = await fetch('/api/getCptCodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicalGuideLines: chunkText, medicalPlan: dataOpenai.medical_plan }),
      });

      if (!getCptCodesResponse.ok) {
        throw new Error(`Failed to process getCptCodes api request: ${getCptCodesResponse.statusText}`);
      }

      const dataOpenaiV2 = await getCptCodesResponse.json();
      console.log('OpenAI Response V2:', dataOpenaiV2);

      // Create authorization with validated data returns newAuth & errors
      const { data: newAuth, errors } = await dynamoDbClient.models.PriorAuthorizations.create({
        patientName: dataOpenai.patient_name,
        patientDateOfBirth: new Date(dataOpenai.patient_dob).toISOString().split('T')[0],
        status: AuthStatus.PENDING,
        icdCodes: JSON.stringify(dataOpenai.icd_codes || []),
        cptCodes: JSON.stringify(dataOpenaiV2.cptCode || []),
        cptCodesExplanation: JSON.stringify(dataOpenaiV2.cptCodesExplanation || []),
        medicalPlan: dataOpenai.medical_plan,
      });

      if (errors) {
        throw new Error('Failed to create authorization in database');
      }

      setAuthorizations(prev => [newAuth, ...prev]);

    } catch (error) {
      console.error('Error processing PDF:', error);
      // You might want to show an error message to the user
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Open the update dialog for the selected authorization
  const handleOpenDialog = (auth: any) => {
    setSelectedAuth(auth);
    setEditingAuth({
      patientName: auth.patientName,
      patientDateOfBirth: new Date(auth.patientDateOfBirth).toISOString().split('T')[0],
      icdCodes: JSON.parse(auth.icdCodes || '[]'),
      cptCodes: JSON.parse(auth.cptCodes || '[]'),
      cptCodesExplanation: auth.cptCodesExplanation || 'N/A',
    });
    setCodesModified(false);
    setCodesValidated(false);
    setValidationResults(null);
    setOverrideAcknowledged(false);
    setIsUpdateDialogOpen(true);
  };

  return (
    <main className="p-8 min-h-screen bg-background">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-2xl font-bold">Prior Authorizations</CardTitle>
          <div className="flex space-x-2">
            <Input
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              id="pdf-upload"
              disabled={isProcessingUpload}
            />
            <label htmlFor="pdf-upload">
              <Button variant="outline" size="sm" asChild disabled={isProcessingUpload}>
                <div className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>
                    {isProcessingUpload ? (
                      <>
                        <span className="animate-spin mr-2">⭮</span>
                        Processing...
                      </>
                    ) : (
                      'Upload PDF'
                    )}
                  </span>
                </div>
              </Button>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {isProcessingUpload && (
            <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
              Processing PDF and creating authorization... Please wait.
            </div>
          )}
          <div className="flex items-center justify-between space-x-2 pb-4">
            <div className="flex flex-1 items-center space-x-2">
              <Select 
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading authorizations...</div>
            </div>
          ) : authorizations.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <p className="text-muted-foreground">No prior authorizations found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ICD Codes</TableHead>
                    <TableHead>CPT Codes</TableHead>
                    <TableHead>CPT Explanations</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Override Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuthorizations.map((auth) => (
                    <TableRow 
                      key={auth.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(auth)}
                    >
                      <TableCell className="font-medium">{auth.id}</TableCell>
                      <TableCell>{auth.patientName}</TableCell>
                      <TableCell>{new Date(auth.patientDateOfBirth).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(auth.status as AuthStatus)}>
                          {auth.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          try {
                            const codes = JSON.parse(auth.icdCodes);
                            return Array.isArray(codes) ? codes.join(", ") : "N/A";
                          } catch {
                            return "N/A";
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          try {
                            const codes = JSON.parse(auth.cptCodes);
                            return Array.isArray(codes) ? codes.join(", ") : "N/A";
                          } catch {
                            return "N/A";
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          try {
                            const explanation = JSON.parse(auth.cptCodesExplanation || '"N/A"');
                            return explanation;
                          } catch {
                            return auth.cptCodesExplanation || "N/A";
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {auth.isOverride ? (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Yes
                          </Badge>
                        ) : "No"}
                      </TableCell>
                      <TableCell>
                        {auth.overrideExplanation || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Prior Authorization Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Update Prior Authorization</DialogTitle>
            <DialogDescription>
              Update information for authorization {selectedAuth?.id}
            </DialogDescription>
          </DialogHeader>
          {editingAuth && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input
                    value={editingAuth.patientName}
                    onChange={(e) => handleAuthUpdate({ patientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={editingAuth.patientDateOfBirth}
                    onChange={(e) => handleAuthUpdate({ patientDateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select onValueChange={(value) => handleAuthUpdate({ status: value as AuthStatus })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" defaultValue={selectedAuth?.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AuthStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={AuthStatus.SUBMITTED}>Submitted</SelectItem>
                    <SelectItem value={AuthStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={AuthStatus.REJECTED}>Rejected</SelectItem>
                    <SelectItem value={AuthStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ICD Codes (comma-separated)</Label>
                <Input
                  value={editingAuth.icdCodes.join(', ')}
                  onChange={(e) => handleAuthUpdate({
                    icdCodes: e.target.value.split(',').map(code => code.trim())
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>CPT Codes (comma-separated)</Label>
                <Input
                  value={editingAuth.cptCodes.join(', ')}
                  onChange={(e) => handleAuthUpdate({
                    cptCodes: e.target.value.split(',').map(code => code.trim())
                  })}
                />
              </div>

              {/* Add validation results section with custom explanation input */}
              {validationResults && (
                <div className={`p-4 rounded-lg border ${
                  validationResults.isValid 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <div className="mb-2">
                    <h4 className="font-semibold">
                      Validation Results ({validationResults.confidence} confidence)
                    </h4>
                  </div>
                  <p className="text-sm mb-2">{validationResults.explanation}</p>
                  {validationResults.suggestedChanges && (
                    <div className="text-sm">
                      <strong>Suggested Changes:</strong>
                      <p>{validationResults.suggestedChanges}</p>
                    </div>
                  )}
                  
                  {/* Add custom explanation input and acknowledgment for invalid results */}
                  {!validationResults.isValid && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label 
                          htmlFor="custom-explanation" 
                          className="text-sm font-medium text-red-700"
                        >
                          Please provide explanation for overriding the validation:
                        </label>
                        <textarea
                          id="custom-explanation"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          rows={3}
                          value={editingAuth?.cptCodesExplanation || ''}
                          onChange={(e) => setEditingAuth(prev => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              cptCodesExplanation: e.target.value
                            };
                          })}
                          placeholder="Enter your explanation for using these CPT codes..."
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="override-acknowledgment"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={overrideAcknowledged}
                          onChange={(e) => setOverrideAcknowledged(e.target.checked)}
                        />
                        <label 
                          htmlFor="override-acknowledgment" 
                          className="text-sm font-medium text-red-700"
                        >
                          I acknowledge the validation recommendations and choose to proceed with saving
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 justify-end">
                <Button
                  onClick={handleValidateCodes}
                  disabled={!codesModified || isValidating}
                  variant="outline"
                >
                  {isValidating ? (
                    <>
                      <span className="animate-spin mr-2">⭮</span>
                      Validating...
                    </>
                  ) : (
                    'Validate Codes'
                  )}
                </Button>
                <Button 
                  onClick={handleSaveChanges}
                  disabled={validationResults?.isValid === false && !overrideAcknowledged}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}




