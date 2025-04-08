"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { AudioWaveform } from "@/components/ui/AudioWaveform";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadIcon, CheckIcon, XIcon, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { cn } from "@/lib/utils";

export default function WaveformUploadTestPage() {
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Waveform configuration
  const [waveColor, setWaveColor] = useState("rgba(0, 185, 205, 0.3)");
  const [progressColor, setProgressColor] = useState("rgba(0, 185, 205, 0.9)");
  const [height, setHeight] = useState(30);
  const [barWidth, setBarWidth] = useState(1);
  const [barGap, setBarGap] = useState(2);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setErrorMessage(null);
    setFileName(file.name);
    
    // Check if the file is an audio file
    if (!file.type.startsWith("audio/")) {
      setErrorMessage("Please upload an audio file (mp3, wav, etc.)");
      setIsUploading(false);
      return;
    }
    
    try {
      // Create a URL for the file
      const url = URL.createObjectURL(file);
      setUploadedAudioUrl(url);
      setIsUploading(false);
    } catch (error) {
      console.error("Error creating URL for file:", error);
      setErrorMessage("An error occurred while processing the file.");
      setIsUploading(false);
    }
  };
  
  const clearUpload = () => {
    // Revoke the object URL to avoid memory leaks
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    
    setUploadedAudioUrl(undefined);
    setFileName("");
    setErrorMessage(null);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setErrorMessage(null);
    setFileName(file.name);
    
    // Check if the file is an audio file
    if (!file.type.startsWith("audio/")) {
      setErrorMessage("Please upload an audio file (mp3, wav, etc.)");
      setIsUploading(false);
      return;
    }
    
    try {
      // Create a URL for the file
      const url = URL.createObjectURL(file);
      setUploadedAudioUrl(url);
      setIsUploading(false);
    } catch (error) {
      console.error("Error creating URL for file:", error);
      setErrorMessage("An error occurred while processing the file.");
      setIsUploading(false);
    }
  };

  // Prepare stems-like display data
  const stemItems = [
    {
      id: "uploaded",
      title: fileName || "Uploaded Audio",
      url: uploadedAudioUrl,
      waveColor: waveColor,
      progressColor: progressColor,
    }
  ];

  return (
    <AuroraBackground>
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl px-4 py-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight mb-4">
              Waveform Test
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your audio file to test the waveform visualization with auto-scrolling enabled.
            </p>
          </div>

          <motion.div
            layout
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="w-full bg-background/10 backdrop-blur-md rounded-lg border border-white/10 p-6 shadow-xl"
          >
            {/* Upload Area */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                "w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 transition-all duration-300 cursor-pointer relative mb-6",
                isDraggingFile ? "border-primary bg-primary/10 scale-[1.02] shadow-lg" : "border-border",
                uploadedAudioUrl ? "h-auto" : "h-64"
              )}
            >
              {!uploadedAudioUrl ? (
                <>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className={cn(
                    "w-12 h-12 mb-4 transition-colors duration-300",
                    isDraggingFile ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="text-lg text-center mb-2">
                    {isDraggingFile
                      ? "Drop your audio file here..." 
                      : "Drag and drop your audio file here"}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Supported formats: MP3, WAV, AIFF
                  </p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} 
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-white border-blue-500/50">
                    Browse Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full border-2 rounded-lg border-border bg-background/50 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        File ready for testing
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearUpload} 
                    className="text-white hover:bg-red-500/20 hover:text-white">
                    <XIcon className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
              
              {errorMessage && (
                <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
              )}
            </div>

            {/* Configuration */}
            <div className="mb-6">
              <h2 className="text-xl font-medium mb-4">Waveform Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Auto-Scroll</Label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant={autoScroll ? "default" : "outline"}
                      onClick={() => setAutoScroll(true)}
                      className="bg-blue-500/20 hover:bg-blue-500/40 border-blue-400/50"
                    >
                      Enabled
                    </Button>
                    <Button 
                      size="sm"
                      variant={!autoScroll ? "default" : "outline"}
                      onClick={() => setAutoScroll(false)}
                      className="bg-blue-500/20 hover:bg-blue-500/40 border-blue-400/50"
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Wave Color</Label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        setWaveColor("rgba(0, 185, 205, 0.3)");
                        setProgressColor("rgba(0, 185, 205, 0.9)");
                      }}
                      className="bg-[rgba(0,185,205,0.3)] hover:bg-[rgba(0,185,205,0.5)] text-white border-[rgba(0,185,205,0.5)]"
                    >
                      Teal
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setWaveColor("rgba(59, 130, 246, 0.3)");
                        setProgressColor("rgba(37, 99, 235, 0.9)");
                      }}
                      className="bg-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.5)] text-white border-[rgba(59,130,246,0.5)]"
                    >
                      Blue
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setWaveColor("rgba(220, 38, 38, 0.3)");
                        setProgressColor("rgba(185, 28, 28, 0.9)");
                      }}
                      className="bg-[rgba(220,38,38,0.3)] hover:bg-[rgba(220,38,38,0.5)] text-white border-[rgba(220,38,38,0.5)]"
                    >
                      Red
                    </Button>
                  </div>
                </div>

                <div className="flex items-end">
                  <Link href="/">
                    <Button variant="outline" 
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-white border-blue-500/50">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Bar Width Slider */}
              <div className="mt-4 space-y-2">
                <Label>Bar Width: {barWidth}px</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={barWidth}
                    onChange={(e) => setBarWidth(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => setBarWidth(Math.max(1, barWidth - 1))}
                      className="bg-blue-500/20 hover:bg-blue-500/40 border-blue-400/50 h-8 w-8 p-0"
                    >
                      -
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setBarWidth(Math.min(10, barWidth + 1))}
                      className="bg-blue-500/20 hover:bg-blue-500/40 border-blue-400/50 h-8 w-8 p-0"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
      
            {/* ExtractedStemsDisplay-style output */}
            {uploadedAudioUrl ? (
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
                      <div className="relative flex flex-col">
                        <div className="mb-8">
                          <AudioWaveform 
                            audioUrl={stem.url} 
                            className=""
                            waveColor={stem.waveColor}
                            progressColor={stem.progressColor}
                            height={80}
                            barWidth={barWidth}
                            barGap={barGap}
                            autoScroll={autoScroll}
                          />
                        </div>
                        <div className="mt-2 pt-2 border-t border-t-gray-800">
                          <a 
                            href={stem.url} 
                            download={fileName || "audio-file.mp3"}
                            className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 relative z-10 mt-2 hover:underline"
                          >
                            Download Audio
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="p-4 border border-border rounded-lg relative">
                    <h4 className="text-lg font-medium mb-4">Visualization Details</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Waveform Properties:</p>
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          <li>Bar Width: {barWidth}px</li>
                          <li>Bar Gap: {barGap}px</li>
                          <li>Height: {height}px</li>
                          <li>Auto-Scroll: {autoScroll ? "Enabled" : "Disabled"}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Colors:</p>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: waveColor }}></div>
                          <p className="text-sm">Waveform: {waveColor}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: progressColor }}></div>
                          <p className="text-sm">Progress: {progressColor}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
} 