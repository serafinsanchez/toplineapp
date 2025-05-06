"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  currentPhase: 'uploading' | 'verifying';
  uploadProgress: number;
  fileName: string;
  fileSize: string;
}

export function UploadProgress({ currentPhase, uploadProgress, fileName, fileSize }: UploadProgressProps) {
  const phases = [
    {
      id: 'uploading',
      label: 'Uploading file',
      icon: Upload,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20'
    },
    {
      id: 'verifying',
      label: 'Verifying upload',
      icon: Server,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/20'
    }
  ];

  const currentPhaseIndex = phases.findIndex(phase => phase.id === currentPhase);
  
  // Calculate the total progress based on the current phase
  const totalProgress = currentPhase === 'uploading' 
    ? uploadProgress * 0.8 // Upload phase represents 0-80%
    : 80 + (uploadProgress * 0.2); // Verification phase represents 80-100%

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full p-4 border-2 border-blue-400/30 rounded-lg bg-blue-50/5"
    >
      {/* File info header */}
      <div className="flex items-center gap-3 mb-4">
        <Upload className="w-5 h-5 text-blue-400" />
        <div>
          <p className="font-medium text-sm">{fileName}</p>
          <p className="text-xs text-muted-foreground">{fileSize}</p>
        </div>
      </div>

      {/* Progress phases */}
      <div className="flex justify-center gap-16 mb-4">
        {phases.map((phase, index) => {
          const PhaseIcon = phase.icon;
          const isActive = index === currentPhaseIndex;
          const isComplete = index < currentPhaseIndex;
          
          return (
            <div key={phase.id} className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ 
                  scale: isActive || isComplete ? 1 : 0.8,
                  opacity: isActive || isComplete ? 1 : 0.5
                }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-2",
                  isComplete ? "bg-green-400/20" : isActive ? phase.bgColor : "bg-gray-200/20"
                )}
              >
                {isComplete ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <PhaseIcon className={cn(
                    "w-4 h-4",
                    isActive ? phase.color : "text-gray-400"
                  )} />
                )}
              </motion.div>
              <span className={cn(
                "text-xs",
                isActive ? phase.color : isComplete ? "text-green-400" : "text-gray-400"
              )}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar - now shown for both phases */}
      <div className="w-full h-1 bg-gray-200/20 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full",
            currentPhase === 'uploading' ? "bg-blue-400" : "bg-indigo-400"
          )}
          initial={{ width: "0%" }}
          animate={{ width: `${totalProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
} 