"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ReloadIcon } from "@radix-ui/react-icons";

// Define single credit package
const CREDIT_PACKAGE = {
  id: 'standard',
  name: 'Credit',
  credits: 1,
  price: 1.00
};

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  stripe_transaction_id: string | null;
}

// Create a separate component for handling search params
function PaymentStatus({ onSuccess }: { onSuccess: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast.success('Payment successful! Credits have been added to your account.');
      onSuccess();
    } else if (canceled === 'true') {
      toast.error('Payment canceled. No credits were added to your account.');
    }
  }, [searchParams, onSuccess]);

  return null;
}

export default function CreditsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (session?.user) {
      fetchUserCredits();
      fetchTransactions();
    } else {
      setIsLoading(false);
    }
  }, [session]);

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
      // Call the purchase API with package ID and quantity
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          packageId: CREDIT_PACKAGE.id,
          quantity: quantity 
        }),
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
      <Suspense fallback={null}>
        <PaymentStatus onSuccess={refreshData} />
      </Suspense>
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
                <h2 className="text-xl font-medium mb-1">Current Balance</h2>
                {isLoading ? (
                  <div className="h-8 w-24 bg-white/10 animate-pulse rounded" />
                ) : (
                  <p className="text-3xl font-bold">
                    {creditBalance !== null ? creditBalance : '0'} credits
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-8 w-8"
                  >
                    -
                  </Button>
                  <span className="w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-8 w-8"
                  >
                    +
                  </Button>
                </div>
                <Button
                  onClick={handlePurchase}
                  disabled={loading || !session?.user}
                  className="relative z-50"
                >
                  {loading ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Buy {quantity} {quantity === 1 ? 'Credit' : 'Credits'} for ${(quantity * CREDIT_PACKAGE.price).toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-medium mb-4">Transaction History</h2>
            {!session?.user ? (
              <p className="text-muted-foreground">
                Please sign in to view your transaction history
              </p>
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground">No transactions yet</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5"
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.type === 'purchase' ? 'Credits Purchased' : 'Credits Used'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    <p className="text-lg font-medium">
                      {transaction.type === 'purchase' ? '+' : ''}{transaction.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
} 