"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

export default function CreditsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const creditPackages: CreditPackage[] = [
    {
      id: "standard",
      name: "Standard",
      credits: 5,
      price: 4.99,
    },
    {
      id: "pro",
      name: "Pro",
      credits: 15,
      price: 12.99,
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      credits: 50,
      price: 39.99,
    },
  ];

  const handlePurchase = (packageId: string) => {
    setLoading(true);
    // In a real app, this would call the API to create a checkout session
    console.log(`Purchasing package: ${packageId}`);
    setTimeout(() => {
      setLoading(false);
      alert(`Awesome! Your ${packageId} package is on its way to supercharging your account!`);
    }, 1000);
  };

  return (
    <AuroraBackground>
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Credits
            </h1>
            <p className="text-muted-foreground">
              Purchase credits to process more audio files
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Your Balance</h2>
                <p className="text-muted-foreground">
                  You have credits to process more files
                </p>
              </div>
              <div className="text-4xl font-bold">3</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-6">Purchase Credits</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-black/20 backdrop-blur-xl rounded-xl border ${
                  pkg.popular
                    ? "border-blue-500"
                    : "border-white/10"
                } p-6 relative`}
              >
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    POPULAR
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold mb-2">${pkg.price}</div>
                <p className="text-muted-foreground mb-6">
                  {pkg.credits} credits
                </p>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Purchase"}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-medium mb-4">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Package</th>
                    <th className="text-left py-3 px-4">Credits</th>
                    <th className="text-left py-3 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">
                      {new Date().toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">Standard</td>
                    <td className="py-3 px-4">5</td>
                    <td className="py-3 px-4">$4.99</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
} 