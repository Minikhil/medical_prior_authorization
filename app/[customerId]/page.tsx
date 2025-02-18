"use client";


import { useState, useEffect, useRef } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "../app.css";
import "../globals.css"
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
  const [fullUrl, setFullUrl] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');

  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    sku: "",
    customerId: params.customerId,
  })

  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusColor = (status : string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewOrder((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newOrderId = `ORD-${String(orders.length + 1).padStart(3, "0")}`
    const createdOrder = {
      ...newOrder,
      id: newOrderId,
      status: "Processing",
      createdAt: new Date().toISOString(),
      customerId: params.customerId,
    }
    setOrders((prev) => [createdOrder, ...prev])
    setNewOrder({
      customerName: "",
      customerEmail: "",
      sku: "",
      customerId: params.customerId,
    })
  }

  const filteredOrders = orders.filter((order) => {
    return statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase();
  });

  async function getOrdersV2() {
    try {
      setLoading(true);
      dynamoDbClient.models.Order.observeQuery({
        filter: {
          customerId: {
            eq: params.customerId
          }
        }
      }).subscribe({
        next: (data) => {
          setOrders([...data.items]);
          if (data.items.length > 0) {
            setCustomerName(data.items[0].customerName);
          }
        },
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getOrdersV2();
  }, []);
  
  return (
    <main className="p-8 min-h-screen bg-[#111111]">
      {/* Order History Card */}
      <Card className="border border-gray-800 bg-[#1A1A1A] shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-2xl font-bold text-white">
            {customerName 
              ? `Order History for ${customerName}`
              : 'Order History'
            }
          </CardTitle>
          <div className="flex space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[#00C853] hover:bg-[#00A847] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A1A] border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Order</DialogTitle>
                  <DialogDescription className="text-gray-400">Fill in the details to create a new order.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="customerName" className="text-gray-300">Customer Name</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={newOrder.customerName}
                      onChange={handleInputChange}
                      required
                      className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail" className="text-gray-300">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      name="customerEmail"
                      type="email"
                      value={newOrder.customerEmail}
                      onChange={handleInputChange}
                      required
                      className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerId" className="text-gray-300">Customer ID</Label>
                    <Input
                      id="customerId"
                      name="customerId"
                      value={params.customerId}
                      disabled
                      required
                      className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku" className="text-gray-300">SKU</Label>
                    <Input 
                      id="sku" 
                      name="sku" 
                      value={newOrder.sku} 
                      onChange={handleInputChange} 
                      required 
                      className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <Button type="submit" className="bg-[#00C853] hover:bg-[#00A847] text-white w-full">
                    Create Order
                  </Button>
                </form>
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
                  <SelectItem value="completed" className="text-gray-300">Completed</SelectItem>
                  <SelectItem value="processing" className="text-gray-300">Processing</SelectItem>
                  <SelectItem value="shipped" className="text-gray-300">Shipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse text-gray-400">Loading orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-[#222222] rounded-lg">
              <p className="text-gray-400">No orders found</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="w-[100px] text-gray-300">Order ID</TableHead>
                    <TableHead className="text-gray-300">Customer</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">SKU</TableHead>
                    <TableHead className="text-right text-gray-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">{order.id}</TableCell>
                      <TableCell>
                        <div className="text-white">{order.customerName}</div>
                        <div className="text-sm text-gray-400">{order.customerEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{order.sku}</TableCell>
                      <TableCell className="text-right text-white">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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
