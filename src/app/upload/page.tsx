"use client";

import { UploadArea } from "@/components/upload/UploadArea";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion } from "framer-motion";

export default function UploadPage() {
  return (
    <AuroraBackground>
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight mb-4">
              Upload Your Audio
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your audio file to extract vocals and instrumentals. We'll process your file and provide you with high-quality stems.
            </p>
          </div>
          
          <UploadArea />
        </motion.div>
      </div>
    </AuroraBackground>
  );
} 