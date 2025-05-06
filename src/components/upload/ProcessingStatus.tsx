"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Waves, Download, Music, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ProcessingStep = {
  id: string;
  label: string;
  shimmerText: string;
  icon: React.ReactNode;
  color: string;
};

interface ProcessingStatusProps {
  isProcessing: boolean;
  onComplete?: () => void;
}

export function ProcessingStatus({ isProcessing, onComplete }: ProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Define the processing steps with their visual properties
  const processingSteps: ProcessingStep[] = [
    {
      id: "analyzing",
      label: "Analyzing audio",
      shimmerText: "Analyzing your track...",
      icon: <Waves className="w-5 h-5" />,
      color: "text-blue-400"
    },
    {
      id: "separating",
      label: "Separating vocals",
      shimmerText: "Isolating vocals from instruments...",
      icon: <Music className="w-5 h-5" />,
      color: "text-indigo-400"
    },
    {
      id: "finalizing",
      label: "Finalizing stems",
      shimmerText: "Polishing your stems...",
      icon: <Download className="w-5 h-5" />,
      color: "text-purple-400"
    }
  ];

  // Simulate the processing steps based on the isProcessing state
  useEffect(() => {
    if (!isProcessing) {
      setCurrentStep(0);
      setIsComplete(false);
      return;
    }

    // Reset state when processing starts
    setCurrentStep(0);
    setIsComplete(false);
    
    // Simulate the progression through steps
    const timers: NodeJS.Timeout[] = [];
    
    // First step starts immediately
    
    // Second step after 5 seconds
    timers.push(setTimeout(() => {
      setCurrentStep(1);
    }, 5000));
    
    // Third step after 10 seconds
    timers.push(setTimeout(() => {
      setCurrentStep(2);
    }, 10000));
    
    // Complete after 15 seconds (this should match your actual processing time)
    timers.push(setTimeout(() => {
      setIsComplete(true);
      if (onComplete) onComplete();
    }, 15000));
    
    return () => {
      // Clean up timers if component unmounts or isProcessing changes
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isProcessing, onComplete]);

  if (!isProcessing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full mt-4 p-6 border-2 border-blue-400/30 rounded-lg bg-blue-50/5 overflow-hidden"
    >
      <div className="flex flex-col space-y-6">
        {processingSteps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="relative mr-4">
              {/* Step indicator circle */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ 
                  scale: currentStep >= index ? 1 : 0.8,
                  opacity: currentStep >= index ? 1 : 0.5
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  currentStep > index 
                    ? "bg-green-500/20" 
                    : currentStep === index 
                      ? index === 0 
                        ? "bg-blue-500/20"
                        : index === 1
                          ? "bg-indigo-500/20"
                          : "bg-purple-500/20"
                      : "bg-gray-200/20"
                )}
              >
                {currentStep > index ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-green-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                ) : currentStep === index ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className={step.color}
                  >
                    <Loader2 className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <div className="text-gray-400 opacity-50">
                    {step.icon}
                  </div>
                )}
              </motion.div>
              
              {/* Connecting line */}
              {index < processingSteps.length - 1 && (
                <motion.div 
                  className="absolute left-5 top-10 w-0.5 bg-gray-200/30 h-6"
                  initial={{ scaleY: 0 }}
                  animate={{ 
                    scaleY: currentStep > index ? 1 : 0,
                    backgroundColor: currentStep > index ? "#10b981" : "rgba(229, 231, 235, 0.3)"
                  }}
                  style={{ transformOrigin: "top" }}
                />
              )}
            </div>
            
            <div className="flex-1">
              <h4 className={cn(
                "font-medium",
                currentStep >= index 
                  ? currentStep > index 
                    ? "text-green-500" 
                    : step.color 
                  : "text-gray-400"
              )}>
                {step.label}
              </h4>
              
              {currentStep === index && (
                <div className="mt-1">
                  <TextShimmerWave
                    className={`text-sm ${
                      step.id === "analyzing" 
                        ? "[--base-color:#3b82f6] [--base-gradient-color:#93c5fd]" 
                        : step.id === "separating" 
                          ? "[--base-color:#6366f1] [--base-gradient-color:#a5b4fc]" 
                          : "[--base-color:#8b5cf6] [--base-gradient-color:#c4b5fd]"
                    }`}
                    duration={1.5}
                    spread={1.2}
                    zDistance={5}
                    scaleDistance={1.05}
                  >
                    {step.shimmerText}
                  </TextShimmerWave>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress bar at the bottom */}
      <motion.div 
        className="mt-6 w-full h-1 bg-gray-200/20 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"
          initial={{ width: "5%" }}
          animate={{ 
            width: isComplete 
              ? "100%" 
              : currentStep === 0 
                ? "33%" 
                : currentStep === 1 
                  ? "66%" 
                  : "90%" 
          }}
          transition={{ duration: 0.8 }}
        />
      </motion.div>
    </motion.div>
  );
} 