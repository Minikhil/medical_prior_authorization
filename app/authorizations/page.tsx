"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useRouter } from 'next/navigation'
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { ChevronDown, Download, Plus, Search } from "lucide-react"
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

export default function App() {
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuth, setSelectedAuth] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const [newAuth, setNewAuth] = useState({
    patientName: "",
    patientDateOfBirth: "",
    cptCodes: [],
    icdCodes: [],
  });

  const [statusFilter, setStatusFilter] = useState("all");

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

  // async function getAuthorizations() {
  //   try {
  //     setLoading(true);
  //     dynamoDbClient.models.PriorAuthorizations.observeQuery().subscribe({
  //       next: (data) => setAuthorizations([...data.items]),
  //     });
  //   } catch (error) {
  //     console.error("Error fetching authorizations:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // useEffect(() => {
  //   getAuthorizations();
  // }, []);

  // const handleStatusUpdate = async (newStatus: AuthStatus) => {
  //   try {
  //     if (!selectedAuth) return;
      
  //     const { data: authData, errors } = await dynamoDbClient.models.PriorAuthorizations.list({
  //       filter: { id: { eq: selectedAuth.id } }
  //     });

  //     if (errors) {
  //       console.error('Errors occurred during query:', errors);
  //       throw new Error('Failed to fetch authorization data.');
  //     }

  //     const latestAuth = authData[0];
  //     if (!latestAuth) {
  //       throw new Error('Authorization not found');
  //     }

  //     const updated = await dynamoDbClient.models.PriorAuthorizations.update({
  //       id: latestAuth.id,
  //       status: newStatus
  //     });

  //     setAuthorizations(authorizations.map(auth => 
  //       auth.id === selectedAuth.id ? updated : auth
  //     ));
      
  //     setIsUpdateDialogOpen(false);
  //     setSelectedAuth(null);
  //   } catch (error) {
  //     console.error("Error updating authorization status:", error);
  //   }
  // };

  return (
    <main className="p-8 min-h-screen bg-background">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-2xl font-bold">Prior Authorizations</CardTitle>
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
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <ChevronDown className="h-4 w-4" />
                <span>Sort</span>
              </Button>
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
                    <TableHead>CPT Codes</TableHead>
                    <TableHead>ICD Codes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuthorizations.map((auth) => (
                    <TableRow 
                      key={auth.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedAuth(auth);
                        setIsUpdateDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{auth.id}</TableCell>
                      <TableCell>{auth.patientName}</TableCell>
                      <TableCell>{new Date(auth.patientDateOfBirth).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(auth.status as AuthStatus)}>
                          {auth.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{Array.isArray(auth.cptCodes) ? auth.cptCodes.join(", ") : "N/A"}</TableCell>
                      <TableCell>{Array.isArray(auth.icdCodes) ? auth.icdCodes.join(", ") : "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Authorization Status</DialogTitle>
            <DialogDescription>
              Update the status for authorization {selectedAuth?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Current Status: {selectedAuth?.status}</Label>
              <Select onValueChange={handleStatusUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
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
          </div>
        </DialogContent>
      </Dialog> */}
    </main>
  )
}




