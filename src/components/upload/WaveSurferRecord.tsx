"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.js";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WaveSurferRecordProps {
  isRecording: boolean;
  onRecordingStart: () => void;
  onRecordingStop: (blob: Blob) => void;
  deviceId?: string;
  height?: number;
}

export function WaveSurferRecord({
  isRecording,
  onRecordingStart,
  onRecordingStop,
  deviceId,
  height = 80
}: WaveSurferRecordProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingInit, setRecordingInit] = useState(false);
  
  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;
    
    console.log("Initializing WaveSurfer and Record plugin");
    
    try {
      // Create WaveSurfer instance
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(0, 185, 205, 0.3)',
        progressColor: 'rgba(0, 185, 205, 0.9)',
        height: height,
        barWidth: 2,
        barGap: 2,
        cursorWidth: 0,
      });
      
      // Create and add Record plugin
      const recordPlugin = wavesurfer.registerPlugin(
        RecordPlugin.create({
          renderRecordedAudio: true,
        })
      );
      
      // Set refs
      wavesurferRef.current = wavesurfer;
      recordPluginRef.current = recordPlugin;
      
      // Event listeners
      wavesurfer.on('play', () => {
        console.log("WaveSurfer: Playback started");
        setIsPlaying(true);
      });
      
      wavesurfer.on('pause', () => {
        console.log("WaveSurfer: Playback paused");
        setIsPlaying(false);
      });
      
      wavesurfer.on('finish', () => {
        console.log("WaveSurfer: Playback finished");
        setIsPlaying(false);
      });
      
      // Recording plugin event listeners
      recordPlugin.on('record-start', () => {
        console.log("RecordPlugin: Recording started");
        setHasRecording(false);
      });
      
      recordPlugin.on('record-end', (blob: Blob) => {
        console.log("RecordPlugin: Recording ended, blob created:", blob);
        console.log("Blob size:", blob.size, "Blob type:", blob.type);
        setHasRecording(true);
        
        // Ensure we have a valid blob with some content
        if (blob && blob.size > 0) {
          onRecordingStop(blob);
          
          // Load the recorded audio for immediate display
          const audioUrl = URL.createObjectURL(blob);
          console.log("Created URL for blob:", audioUrl);
          
          // Load the recording into WaveSurfer for visualization and playback
          setTimeout(() => {
            if (wavesurferRef.current) {
              console.log("Loading recorded audio into WaveSurfer");
              wavesurferRef.current.load(audioUrl);
            }
          }, 100);
        } else {
          console.error("RecordPlugin produced an empty or invalid blob");
        }
      });
      
      // Initialize mic visualization
      startMicVisualization();
      
      // Cleanup
      return () => {
        if (recordPluginRef.current) {
          console.log("Cleaning up RecordPlugin");
          recordPluginRef.current.stopMic();
        }
        console.log("Destroying WaveSurfer instance");
        wavesurfer.destroy();
      };
    } catch (error) {
      console.error("Error initializing WaveSurfer:", error);
    }
  }, [height]);
  
  // Handle device ID changes
  useEffect(() => {
    if (deviceId && recordPluginRef.current) {
      console.log("Device ID changed, restarting mic with new device:", deviceId);
      // Restart mic with new device
      recordPluginRef.current.stopMic();
      startMicVisualization();
    }
  }, [deviceId]);
  
  // Handle recording state changes
  useEffect(() => {
    if (!recordPluginRef.current) {
      console.log("Record plugin not initialized yet");
      return;
    }
    
    try {
      const isCurrentlyRecording = recordPluginRef.current.isRecording();
      console.log("Recording state change detected", { isRecording, isCurrentlyRecording });
      
      if (isRecording && !isCurrentlyRecording) {
        console.log("Starting recording from state change");
        startRecording();
        setRecordingInit(true);
      } else if (!isRecording && isCurrentlyRecording && recordingInit) {
        console.log("Stopping recording from state change");
        stopRecording();
      }
    } catch (error) {
      console.error("Error in recording state change handler:", error);
    }
  }, [isRecording]);
  
  // Reset hasRecording when restarting recording
  useEffect(() => {
    if (isRecording) {
      console.log("Resetting hasRecording state for new recording");
      setHasRecording(false);
    }
  }, [isRecording]);
  
  // Start microphone visualization
  const startMicVisualization = async () => {
    if (!recordPluginRef.current) {
      console.log("Cannot start mic visualization - record plugin not initialized");
      return;
    }
    
    try {
      console.log("Starting microphone visualization with device:", deviceId);
      // Start microphone with selected device if provided
      await recordPluginRef.current.startMic({
        deviceId: deviceId ? { exact: deviceId } : undefined,
      });
      console.log("Microphone visualization started successfully");
    } catch (error) {
      console.error('Error starting microphone visualization:', error);
    }
  };
  
  // Start recording
  const startRecording = async () => {
    if (!recordPluginRef.current) {
      console.log("Cannot start recording - record plugin not initialized");
      return;
    }
    
    try {
      console.log("Starting recording with RecordPlugin");
      recordPluginRef.current.startRecording();
      onRecordingStart();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (!recordPluginRef.current) {
      console.log("Cannot stop recording - record plugin not initialized");
      return;
    }
    
    try {
      if (recordPluginRef.current.isRecording()) {
        console.log("Stopping active recording");
        recordPluginRef.current.stopRecording();
      } else {
        console.log("No active recording to stop");
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };
  
  // Toggle playback
  const togglePlayback = () => {
    if (wavesurferRef.current) {
      console.log("Toggling playback");
      wavesurferRef.current.playPause();
    }
  };
  
  return (
    <div className="w-full">
      <div className="relative">
        <div 
          ref={waveformRef} 
          className="w-full h-24 rounded-md overflow-hidden bg-[rgba(20,20,30,0.4)] border border-white/10"
        />
        
        {hasRecording && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-emerald-400/70 text-sm animate-pulse">
              Click Play below to hear your recording
            </div>
          </div>
        )}
      </div>
      
      {hasRecording && (
        <div className="flex justify-center mt-3">
          <Button
            onClick={togglePlayback}
            variant="outline"
            size="sm"
            className={cn(
              "text-sm border hover:bg-white/5 transition-all duration-200 px-4 py-2",
              isPlaying 
                ? "border-red-400/40 bg-red-500/10 text-red-400 hover:bg-red-500/20" 
                : "border-emerald-400/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            )}
          >
            <span className="flex items-center gap-2">
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Playback
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Play Recording
                </>
              )}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
} 