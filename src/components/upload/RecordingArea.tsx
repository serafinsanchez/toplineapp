"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";
import { RecordingModal } from "./RecordingModal";

interface RecordingAreaProps {
  onRecordingComplete: (file: File) => void;
  onCancel: () => void;
}

export function RecordingArea({ onRecordingComplete, onCancel }: RecordingAreaProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const initializeRecording = async () => {
    try {
      // Check if browser supports MediaRecorder
      if (!window.MediaRecorder) {
        setDropError('Your browser does not support audio recording. Please try uploading a file instead.');
        return;
      }
      
      // Request microphone permission
      const permissionResult = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream we just created for the permission check
      permissionResult.getTracks().forEach(track => track.stop());
      
      // Open the recording modal
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setDropError('Microphone access denied. Please allow microphone access to record audio.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div 
          className="w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 border-border"
        >
          <Mic className="w-12 h-12 mb-4 text-muted-foreground" />
          <p className="text-lg text-center mb-2">
            Record audio directly from your microphone
          </p>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Up to 5 minutes of recording time
          </p>
          
          <div className="relative z-30">
            <ShimmerButton
              onClick={initializeRecording}
              className="font-medium text-sm px-4 py-2"
              background="rgba(60, 65, 80, 0.6)"
              shimmerColor="rgba(180, 185, 210, 0.5)"
            >
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3" /> Start Recording
              </span>
            </ShimmerButton>
          </div>
          
          {dropError && (
            <p className="text-sm text-red-500 mt-4">{dropError}</p>
          )}
          
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-sm text-muted-foreground"
            >
              Back to upload
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Recording Modal */}
      {isModalOpen && (
        <RecordingModal
          onComplete={onRecordingComplete}
          onCancel={() => {
            setIsModalOpen(false);
            setDropError(null);
          }}
          onError={(errorMessage) => {
            setIsModalOpen(false);
            setDropError(errorMessage);
          }}
        />
      )}
    </div>
  );
} 