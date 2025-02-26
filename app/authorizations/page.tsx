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

Amplify.configure(outputs);

const dynamoDbClient = generateClient<Schema>();

enum AuthStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  SUBMITTED = "SUBMITTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

interface EditableAuth {
  patientName: string;
  patientDateOfBirth: string;
  icdCodes: string[];
  cptCodes: string[];
}

interface EditableFields {
  patientName?: string;
  patientDateOfBirth?: string;
  status?: AuthStatus;
  icdCodes?: string[];
  cptCodes?: string[];
}

export default function App() {
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuth, setSelectedAuth] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [newAuth, setNewAuth] = useState({
    patientName: "",
    patientDateOfBirth: "",
    cptCodes: [],
    icdCodes: [],
  });

  const [statusFilter, setStatusFilter] = useState("all");

  const [editingAuth, setEditingAuth] = useState<EditableAuth | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewAuth((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newAuthId = `AUTH-${String(authorizations.length + 1).padStart(3, "0")}`
    const createdAuth = {
      ...newAuth,
      id: newAuthId,
      status: "Processing",
      createdAt: new Date().toISOString(),
    }
    setAuthorizations((prev) => [createdAuth, ...prev])
    setNewAuth({
      patientName: "",
      patientDateOfBirth: "",
      cptCodes: [],
      icdCodes: [],
    })
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

  useEffect(() => {
    getAuthorizations();
  }, []);

  const handleFieldChange = (changes: EditableFields) => {
    if (!selectedAuth || !editingAuth) return;
    
    // Update the editing form state
    setEditingAuth(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...changes
      };
    });

    // Update the selected auth state
    setSelectedAuth(prev => ({
      ...prev,
      ...changes
    }));
  };

  const handleSaveChanges = async () => {
    try {
      if (!selectedAuth || !editingAuth) return;

      // Update the record in DynamoDB
      const updated = await dynamoDbClient.models.PriorAuthorizations.update({
        id: selectedAuth.id,
        patientName: editingAuth.patientName,
        patientDateOfBirth: editingAuth.patientDateOfBirth,
        status: selectedAuth.status,
        icdCodes: JSON.stringify(editingAuth.icdCodes),
        cptCodes: JSON.stringify(editingAuth.cptCodes),
        cptCodesExplanation: selectedAuth.cptCodesExplanation,
      });

      if (!updated) {
        throw new Error('Failed to update authorization');
      }

      // Update the local state with the new data
      setAuthorizations(prev => 
        prev.map(auth => auth.id === selectedAuth.id ? updated : auth)
      );
      
      // Close the dialog and reset states after successful update
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
      setPdfLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }

      const dataPdf = await response.json();
      console.log('API Response:', dataPdf);

      // Send the extracted text to OpenAI API
      const responseOpenai = await fetch('/api/openai', {
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
      const responseRagie = await fetch('/api/ragie', {
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
      });

      if (errors) {
        throw new Error('Failed to create authorization in database');
      }

      setAuthorizations(prev => [newAuth, ...prev]);

    } catch (error) {
      console.error('Error processing PDF:', error);
      // You might want to show an error message to the user
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenDialog = (auth: any) => {
    setSelectedAuth(auth);
    setEditingAuth({
      patientName: auth.patientName,
      patientDateOfBirth: new Date(auth.patientDateOfBirth).toISOString().split('T')[0],
      icdCodes: JSON.parse(auth.icdCodes || '[]'),
      cptCodes: JSON.parse(auth.cptCodes || '[]'),
    });
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
            />
            <label htmlFor="pdf-upload">
              <Button variant="outline" size="sm" asChild>
                <div className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>{pdfLoading ? 'Processing...' : 'Upload PDF'}</span>
                </div>
              </Button>
            </label>
          </div>
        </CardHeader>
        <CardContent>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                    onChange={(e) => handleFieldChange({ patientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={editingAuth.patientDateOfBirth}
                    onChange={(e) => handleFieldChange({ patientDateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select onValueChange={(value) => handleFieldChange({ status: value as AuthStatus })}>
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
                  onChange={(e) => handleFieldChange({
                    icdCodes: e.target.value.split(',').map(code => code.trim())
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>CPT Codes (comma-separated)</Label>
                <Input
                  value={editingAuth.cptCodes.join(', ')}
                  onChange={(e) => handleFieldChange({
                    cptCodes: e.target.value.split(',').map(code => code.trim())
                  })}
                />
              </div>

              <Button onClick={handleSaveChanges}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}




