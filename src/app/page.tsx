"use client";

import { AuroraSparklesDemo } from "@/components/ui/aurora-sparkles-demo";
import { FooterLink } from "@/components/ui/footer-link";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  
  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="flex-1 relative">
        <AuroraSparklesDemo />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 mt-20 flex gap-4 justify-center z-30"
        >
          {isAuthenticated ? (
            <ShimmerButton 
              onClick={() => router.push('/upload')}
              className="font-medium text-lg py-6 px-10"
              shimmerColor="rgba(138, 180, 248, 0.8)"
              background="rgba(25, 55, 125, 0.4)"
            >
              Try Now
            </ShimmerButton>
          ) : (
            <ShimmerButton 
              onClick={() => router.push('/upload')}
              className="font-medium text-lg py-6 px-10"
              shimmerColor="rgba(138, 180, 248, 0.8)"
              background="rgba(25, 55, 125, 0.4)"
            >
              Try Now
            </ShimmerButton>
          )}
        </motion.div>
      </div>
    </div>
  );
}
