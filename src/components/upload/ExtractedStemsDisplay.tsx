"use client";

import React from "react";
import { motion } from "framer-motion";
import { StemExtractionResult } from "@/types";

// Utility function to convert base64 to Blob
function base64ToBlob(base64: string, type: string): Blob {
  // Check if this is a data URL (contains comma) or raw base64
  let byteCharacters: string;
  if (base64.includes(',')) {
    // Data URL format: "data:audio/wav;base64,ACTUAL_BASE64_DATA"
    byteCharacters = atob(base64.split(',')[1]);
  } else {
    // Raw base64 format: just the encoded data
    byteCharacters = atob(base64);
  }
  
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

interface ExtractedStemsDisplayProps {
  extractedStems: StemExtractionResult;
}

export function ExtractedStemsDisplay({ extractedStems }: ExtractedStemsDisplayProps) {
  if (!extractedStems) return null;
  
  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = base64ToBlob(data, type);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;  // Ensure MP3 extension
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="w-full mt-8 p-6 border-2 border-blue-400 rounded-lg bg-blue-50/5"
    >
      
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Acapella */}
        <div className="p-4 border border-border rounded-lg">
          <h4 className="text-lg font-medium mb-2">Acapella</h4>
          <audio controls className="w-full mb-3">
            <source src={extractedStems.acapella.url} type={extractedStems.acapella.type} />
            Your browser does not support the audio element.
          </audio>
          <a 
            href={extractedStems.acapella.url} 
            download={extractedStems.acapella.name}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 relative z-10"
          >
            Download Acapella
          </a>
        </div>
        
        {/* Instrumental */}
        <div className="p-4 border border-border rounded-lg">
          <h4 className="text-lg font-medium mb-2">Instrumental</h4>
          <audio controls className="w-full mb-3">
            <source src={extractedStems.instrumental.url} type={extractedStems.instrumental.type} />
            Your browser does not support the audio element.
          </audio>
          <a 
            href={extractedStems.instrumental.url} 
            download={extractedStems.instrumental.name}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 relative z-10"
          >
            Download Instrumental
          </a>
        </div>
      </div>
    </motion.div>
  );
} 