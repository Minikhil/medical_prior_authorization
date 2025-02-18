"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import "./../app/app.css";

export default function Home() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    customerId: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // For now, just redirect to the customer page
    // In a real application, you would validate credentials here
    router.push(`/customer/${credentials.customerId}`);
  };

  return (
    <main className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-6xl font-bold text-white tracking-tight">
          GANDER
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl">
          Experience the Automation System for Global Aviation, 
          streamlining operations across multiple devices on a shared platform.
        </p>
      </div>

      <Card className="w-full max-w-md border border-gray-800 bg-[#1A1A1A] shadow-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            Customer Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customerId" className="text-gray-300">Customer ID</Label>
              <Input
                id="customerId"
                name="customerId"
                placeholder="Enter your customer ID"
                value={credentials.customerId}
                onChange={handleInputChange}
                required
                className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                className="bg-[#222222] border-gray-800 text-white placeholder:text-gray-600 h-12"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-[#00C853] hover:bg-[#00A847] text-white font-semibold text-lg transition-colors"
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl text-center">
        <div className="space-y-2">
          <div className="text-[#00C853] text-2xl mb-2">⚡</div>
          <h3 className="text-white font-semibold">AI Powered</h3>
          <p className="text-gray-400 text-sm">Enhanced operations with intelligent automation</p>
        </div>
        <div className="space-y-2">
          <div className="text-[#00C853] text-2xl mb-2">👥</div>
          <h3 className="text-white font-semibold">Multi-user</h3>
          <p className="text-gray-400 text-sm">Collaborate across different departments</p>
        </div>
        <div className="space-y-2">
          <div className="text-[#00C853] text-2xl mb-2">🎯</div>
          <h3 className="text-white font-semibold">Easy to Use</h3>
          <p className="text-gray-400 text-sm">Simple interface with intuitive controls</p>
        </div>
        <div className="space-y-2">
          <div className="text-[#00C853] text-2xl mb-2">🔄</div>
          <h3 className="text-white font-semibold">Real-time Sync</h3>
          <p className="text-gray-400 text-sm">Instant updates across all devices</p>
        </div>
      </div>
    </main>
  );
}




