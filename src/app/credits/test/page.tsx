"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";

export default function TestCreditsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testCredits = async (method: string) => {
    if (!session) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method }),
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast.success(`Credits added using ${method} method`);
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing credits:', error);
      toast.error('Error testing credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Credit System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Credits</h2>
          <div className="space-y-4">
            <Button 
              onClick={() => testCredits('transaction')} 
              disabled={loading}
              className="w-full"
            >
              Add 5 Credits (Transaction)
            </Button>
            
            <Button 
              onClick={() => testCredits('direct')} 
              disabled={loading}
              className="w-full"
            >
              Add 5 Credits (Direct)
            </Button>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          {result ? (
            <pre className="p-4 bg-gray-800 text-white rounded-lg overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <p>No result yet</p>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <Link href="/credits">
          <Button variant="outline">
            Back to Credits Page
          </Button>
        </Link>
      </div>
    </div>
  );
} 