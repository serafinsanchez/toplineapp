"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { StemExtractionResult } from "@/types";
import { AudioWaveform } from "@/components/ui/AudioWaveform";

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
  
  // Debug logging
  useEffect(() => {
    console.log('[ExtractedStemsDisplay] Stems received:', {
      acapella: extractedStems.acapella,
      instrumental: extractedStems.instrumental
    });
  }, [extractedStems]);

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

  // Define stem items for consistency and future scalability
  const stemItems = [
    {
      id: "acapella",
      title: "Acapella",
      data: extractedStems.acapella,
      waveColor: "rgba(59, 130, 246, 0.3)", // Lighter blue for unplayed audio
      progressColor: "rgba(37, 99, 235, 0.9)", // Darker, more solid blue for played audio
    },
    {
      id: "instrumental",
      title: "Instrumental",
      data: extractedStems.instrumental,
      waveColor: "rgba(124, 58, 237, 0.3)", // Lighter purple for unplayed audio
      progressColor: "rgba(109, 40, 217, 0.9)", // Darker, more solid purple for played audio
    }
  ];

  // Log URLs for debugging
  console.log('[ExtractedStemsDisplay] Audio URLs:', {
    acapella: extractedStems.acapella?.url,
    instrumental: extractedStems.instrumental?.url
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="w-full mt-8 p-6 border-2 border-blue-400 rounded-lg bg-blue-50/5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stemItems.map(stem => (
          <div 
            key={stem.id}
            className="p-4 border border-border rounded-lg relative"
          >
            <h4 className="text-lg font-medium mb-4">{stem.title}</h4>
            {stem.data && stem.data.url ? (
              <div className="relative flex flex-col">
                <div className="mb-8">
                  <AudioWaveform 
                    audioUrl={stem.data.url} 
                    className=""
                    waveColor={stem.waveColor}
                    progressColor={stem.progressColor}
                    height={80}
                    barWidth={3}
                    barGap={2}
                  />
                </div>
                <div className="mt-2 pt-2 border-t border-t-gray-800">
                  <a 
                    href={stem.data.url} 
                    download={stem.data.name}
                    className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 relative z-10 mt-2 hover:underline"
                  >
                    Download {stem.title}
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-4 text-sm text-red-400">
                Audio data unavailable for {stem.title}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
} 