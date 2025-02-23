"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { Amplify } from "aws-amplify";
import { useRouter } from 'next/navigation'
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { ChevronDown, Download, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

Amplify.configure(outputs);

const dynamoDbClient = generateClient<Schema>();

export default function Page({ params }: { params: { customerId: string } }) {
  const router = useRouter();
  const [priorAuths, setPriorAuths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPriorAuth, setNewPriorAuth] = useState({
    patientName: "",
    patientDateOfBirth: "",
    cptCodes: [],
    icdCodes: [],
    employeeId: params.customerId,
  });

  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "submitted":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewPriorAuth((prev) => ({ ...prev, [name]: value }))
  }

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault()
  
  //   try {
  //     await dynamoDbClient.models.PriorAuthorizations.create({
  //       patientName: newPriorAuth.patientName,
  //       patientDateOfBirth: new Date(newPriorAuth.patientDateOfBirth).toISOString(),
  //       employeeId: params.customerId,
  //       status: "PENDING",
  //       cptCodes: JSON.stringify(newPriorAuth.cptCodes),
  //       icdCodes: JSON.stringify(newPriorAuth.icdCodes),
  //     });

  //     setNewPriorAuth({
  //       patientName: "",
  //       patientDateOfBirth: "",
  //       cptCodes: [],
  //       icdCodes: [],
  //       employeeId: params.customerId,
  //     });
      
  //     setDialogOpen(false);
  //   } catch (error) {
  //     console.error("Error creating prior authorization:", error);
  //     setError("There was a problem creating the prior authorization. Please try again.");
  //   }
  // }

  const filteredPriorAuths = priorAuths.filter((auth) => {
    return statusFilter === "all" || auth.status.toLowerCase() === statusFilter.toLowerCase();
  });

  // async function getPriorAuths() {
  //   try {
  //     setLoading(true);
  //     dynamoDbClient.models.PriorAuthorizations.observeQuery({
  //       filter: {
  //         employeeId: {
  //           eq: params.customerId
  //         }
  //       }
  //     }).subscribe({
  //       next: (data) => {
  //         setPriorAuths([...data.items]);
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Error fetching prior authorizations:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // useEffect(() => {
  //   getPriorAuths();
  // }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <main className="p-8 min-h-screen bg-[#111111]">
      {error && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      <Card className="border border-gray-800 bg-[#1A1A1A] shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-2xl font-bold text-white">
            Prior Authorizations
          </CardTitle>
          <div className="flex space-x-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#00C853] hover:bg-[#00A847] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Prior Authorization
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A1A] border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Prior Authorization</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Enter the patient information and codes for the new prior authorization.
                  </DialogDescription>
                </DialogHeader>
                {/* <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="patientName" className="text-gray-300">Patient Name</Label>
                    <Input 
                      id="patientName" 
                      name="patientName" 
                      value={newPriorAuth.patientName} 
                      onChange={handleInputChange} 
                      placeholder="Enter patient name"
                      required 
                      className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patientDateOfBirth" className="text-gray-300">Date of Birth</Label>
                    <Input 
                      id="patientDateOfBirth" 
                      name="patientDateOfBirth" 
                      type="date"
                      value={newPriorAuth.patientDateOfBirth} 
                      onChange={handleInputChange}
                      required 
                      className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" className="bg-[#00C853] hover:bg-[#00A847] text-white w-full">
                      Create Prior Authorization
                    </Button>
                  </div>
                </form> */}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2 pb-4">
            <div className="flex flex-1 items-center space-x-2">
              <Select 
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px] bg-[#222222] border-gray-800 text-gray-300">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-800">
                  <SelectItem value="all" className="text-gray-300">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED" className="text-gray-300">Completed</SelectItem>
                  <SelectItem value="PENDING" className="text-gray-300">Pending</SelectItem>
                  <SelectItem value="SUBMITTED" className="text-gray-300">Submitted</SelectItem>
                  <SelectItem value="REJECTED" className="text-gray-300">Rejected</SelectItem>
                  <SelectItem value="CANCELLED" className="text-gray-300">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse text-gray-400">Loading prior authorizations...</div>
            </div>
          ) : priorAuths.length === 0 ? (
            <div className="text-center py-12 bg-[#222222] rounded-lg">
              <p className="text-gray-400">No prior authorizations found</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="w-[100px] text-gray-300">ID</TableHead>
                    <TableHead className="text-gray-300">Patient</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Date of Birth</TableHead>
                    <TableHead className="text-right text-gray-300">Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPriorAuths.map((auth) => (
                    <TableRow key={auth.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">{auth.id}</TableCell>
                      <TableCell>
                        <div className="text-white">{auth.patientName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(auth.status)}>
                          {auth.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">
                        {new Date(auth.patientDateOfBirth).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {new Date(auth.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
