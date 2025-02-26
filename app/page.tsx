"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./../app/app.css";

export default function Home() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
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
    router.push('/authorizations');
    setIsLoginOpen(false);
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center p-4">
      {/* Navigation */}
      <nav className="w-full max-w-7xl flex justify-between items-center py-4 px-6">
        <h1 className="text-2xl font-semibold text-black">Tivara</h1>
        <div className="flex gap-4">
          <a href="#features" className="text-gray-600">Features</a>
          <a href="#team" className="text-gray-600">Team</a>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsLoginOpen(true)}
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center mt-32 mb-8 space-y-4 max-w-4xl">
        <h2 className="text-5xl font-semibold text-black leading-tight">
          We automate prior authorizations,<br />
          so you can deliver care faster
        </h2>
        <p className="text-gray-600 text-lg mt-4">
          Care-critical prior authorizations approved 30x faster and at 80%<br />
          lower cost, seamlessly integrated into your practice's workflow.
        </p>
        <Button 
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
          onClick={() => setIsLoginOpen(true)}
        >
          Login
        </Button>
      </div>

      {/* Dashboard Preview */}
      <div className="w-full max-w-6xl mt-16 px-4">
        <div className="bg-white rounded-lg shadow-xl">
          <img 
            src="/dashboard.png" 
            alt="Tivara Dashboard Preview" 
            className="w-full rounded-lg"
          />
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Login to Tivara</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID</Label>
              <Input
                id="customerId"
                name="customerId"
                placeholder="Enter your customer ID"
                value={credentials.customerId}
                onChange={handleInputChange}
                required
                className="border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                className="border-gray-200"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Login
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}




