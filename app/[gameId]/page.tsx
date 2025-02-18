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

Amplify.configure(outputs);


const dynamoDbClient = generateClient<Schema>();

export default function Page({ params }: { params: { userId: string } }) {

  const router = useRouter();

  const [fullUrl, setFullUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Full URL, including domain
      setFullUrl(window.location.href);
    }
  }, [router]);
  
  return (
    <main className="max-h-screen bg-black text-white p-4 md:p-8 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-center gap-3">
          <a href={process.env.NEXT_PUBLIC_DOMAIN} className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            CODENAMES AI
          </a>
        </div>
      </div>   
    </main>
  )
}
