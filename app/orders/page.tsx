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

enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export default function App() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    sku: "",
    customerId: "",
  })

  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED:
        return "bg-green-100 text-green-800"
      case OrderStatus.PROCESSING:
        return "bg-blue-100 text-blue-800"
      case OrderStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800"
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
    }
    setOrders((prev) => [createdOrder, ...prev])
    setNewOrder({
      customerName: "",
      customerEmail: "",
      sku: "",
      customerId: "",
    })
  }

  const filteredOrders = orders.filter((order) => {
    return statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase();
  });

  async function getOrdersV2() {
    try {
      setLoading(true);
      dynamoDbClient.models.Order.observeQuery().subscribe({
        next: (data) => setOrders([...data.items]),
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

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      if (!selectedOrder) return;
      
      // First fetch the latest order record
      const { data: orderData, errors } = await dynamoDbClient.models.Order.list({
        filter: { id: { eq: selectedOrder.id } }
      });

      if (errors) {
        console.error('Errors occurred during query:', errors);
        throw new Error('Failed to fetch order data.');
      }

      const latestOrder = orderData[0];
      if (!latestOrder) {
        throw new Error('Order not found');
      }

      console.log('Updating order with status:', newStatus); // Debug log
      const updated = await dynamoDbClient.models.Order.update({
        id: latestOrder.id,  // Make sure we include the id
        status: newStatus    // The enum value should work directly
      });

      setOrders(orders.map(order => 
        order.id === selectedOrder.id ? updated : order
      ));
      
      setIsUpdateDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  return (
    <main className="p-8 min-h-screen bg-background">
      {/* Order History Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-2xl font-bold">Order History</CardTitle>
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
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
              <div className="animate-pulse text-muted-foreground">Loading orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsUpdateDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>
                        <div>{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(order.status as OrderStatus)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.sku}</TableCell>
                      <TableCell className="text-right">
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

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update the status for order {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Current Status: {selectedOrder?.status}</Label>
              <Select onValueChange={handleStatusUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderStatus.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={OrderStatus.PROCESSING}>Processing</SelectItem>
                  <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}




