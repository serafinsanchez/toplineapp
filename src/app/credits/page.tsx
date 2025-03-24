"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ReloadIcon } from "@radix-ui/react-icons";

// Define single credit package
const CREDIT_PACKAGE = {
  id: 'standard',
  name: 'Credits Package',
  credits: 10,
  price: 9.99
};

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  stripe_transaction_id: string | null;
}

export default function CreditsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (session?.user) {
      fetchUserCredits();
      fetchTransactions();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // Check for success/canceled payment
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast.success('Payment successful! Credits have been added to your account.');
      // Refresh credits and transactions after successful payment
      refreshData();
    } else if (canceled === 'true') {
      toast.error('Payment canceled. No credits were added to your account.');
    }
  }, [searchParams]);

  const fetchUserCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.credits !== undefined) {
        setCreditBalance(data.credits);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching credits:', error);
      toast.error('Failed to load credit balance');
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/credits/transactions');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Don't show a toast for transaction errors as they're not critical
      // and the empty state will already indicate no transactions
    }
  };

  const refreshData = async () => {
    console.log('refreshData called');
    if (!session?.user) {
      console.log('No session user, returning');
      return;
    }
    
    console.log('Starting refresh');
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchUserCredits(),
        fetchTransactions()
      ]);
      console.log('Refresh successful');
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePurchase = async () => {
    if (!session?.user) {
      toast.error('Please sign in to purchase credits');
      return;
    }

    setLoading(true);
    
    try {
      // Call the purchase API with package ID
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId: CREDIT_PACKAGE.id }),
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Error creating checkout session');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AuroraBackground>
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">
                Credits
              </h1>
              <p className="text-muted-foreground">
                Purchase credits to process more audio files
              </p>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing || !session?.user}
              className="z-50 relative hover:bg-white/10 active:bg-white/20"
            >
              {isRefreshing ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Your Balance</h2>
                <p className="text-muted-foreground">
                  You have credits to process more files
                </p>
              </div>
              <div className="text-4xl font-bold">
                {isLoading ? (
                  <span className="text-muted-foreground text-2xl">Loading...</span>
                ) : (
                  creditBalance === null ? "Error" : creditBalance
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-6">Purchase Credits</h2>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-8 flex flex-col items-center justify-center max-w-md mx-auto mb-8">
            <h3 className="text-2xl font-semibold mb-2">{CREDIT_PACKAGE.name}</h3>
            <div className="text-4xl font-bold mb-3">${CREDIT_PACKAGE.price.toFixed(2)}</div>
            <p className="text-muted-foreground mb-6">Get {CREDIT_PACKAGE.credits} credits</p>
            <Button
              className="w-full"
              size="lg"
              onClick={handlePurchase}
              disabled={loading || !session?.user}
            >
              {loading ? "Processing..." : "Purchase Credits"}
            </Button>
            {!session?.user && (
              <p className="text-sm text-muted-foreground mt-4">Please sign in to purchase credits</p>
            )}
          </div>

          {transactions.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-semibold mb-6">Transaction History</h2>
              <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap">{formatDate(transaction.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap capitalize">{transaction.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={transaction.amount > 0 ? "text-green-400" : "text-red-400"}>
                              {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                            {transaction.stripe_transaction_id ? transaction.stripe_transaction_id.substring(0, 10) + "..." : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AuroraBackground>
  );
} 