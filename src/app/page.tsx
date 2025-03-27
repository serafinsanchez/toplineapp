"use client";

import { AuroraSparklesDemo } from "@/components/ui/aurora-sparkles-demo";
import { FooterLink } from "@/components/ui/footer-link";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="flex-1 relative">
        <AuroraSparklesDemo />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-4 justify-center z-30"
        >
          <ShimmerButton 
            onClick={() => router.push('/upload')}
            className="font-medium"
            shimmerColor="rgba(138, 180, 248, 0.8)"
            background="rgba(25, 55, 125, 0.4)"
          >
            Try Now
          </ShimmerButton>
          
          <ShimmerButton 
            onClick={() => router.push('/auth/signup')}
            className="font-medium"
            shimmerColor="rgba(138, 180, 248, 0.4)"
            background="rgba(0, 0, 0, 0.7)"
          >
            Sign Up
          </ShimmerButton>
          
          <ShimmerButton 
            onClick={() => router.push('/auth/signin')}
            className="font-medium"
            background="rgba(0, 0, 0, 0.7)"
          >
            Sign In
          </ShimmerButton>
        </motion.div>
      </div>
    </div>
  );
}
