"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, CheckCircle, XCircle, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";
import { AudioMeter } from "./AudioMeter";
import { WaveSurferRecord } from "./WaveSurferRecord";

interface RecordingModalProps {
  onComplete: (file: File) => void;
  onCancel: () => void;
  onError: (errorMessage: string) => void;
}

export function RecordingModal({ onComplete, onCancel, onError }: RecordingModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [dropError, setDropError] = useState<string | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  /**
   * Initialize audio recording by requesting microphone permissions
   * and retrieving available input devices
   */
  const initializeAudioRecording = async () => {
    try {
      // Get initial microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get list of audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      setAudioInputDevices(audioInputs);
      
      // If devices found, select the default/first one
      if (audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
        await selectMicrophoneDevice(audioInputs[0].deviceId);
      } else {
        // Release initial stream as we'll get a new one when selecting a device
        stream.getTracks().forEach(track => track.stop());
      }
      
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      onError('Microphone access denied. Please allow microphone access to record audio.');
      return false;
    }
  };

  /**
   * Select a specific microphone device and initialize audio stream
   */
  const selectMicrophoneDevice = async (deviceId: string) => {
    try {
      // Stop any existing stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      // Get stream for specific device
      const constraints = {
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setAudioStream(stream);
      setSelectedDeviceId(deviceId);
      
      // Setup audio level meter
      setupAudioMeter(stream);
      
      return true;
    } catch (error) {
      console.error('Error selecting microphone:', error);
      setDropError('Failed to access the selected microphone.');
      return false;
    }
  };
  
  /**
   * Setup audio meter for visualization
   */
  const setupAudioMeter = (stream: MediaStream) => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!audioContextRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Normalize to 0-1 and apply some curve for better visualization
        const normalizedValue = Math.min(1, Math.pow(average / 128, 1.5));
        setAudioLevel(normalizedValue);
        
        // Continue updating if component is still mounted
        requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio meter:', error);
      // Non-critical error, continue without meter
    }
  };

  /**
   * Start recording handled by WaveSurferRecord
   */
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        // Auto-stop at 5 minutes (300 seconds)
        if (newTime >= 300) {
          stopRecording();
        }
        return newTime;
      });
    }, 1000);
  };

  /**
   * Stop recording
   */
  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
  };

  /**
   * Clean up recording resources and reset state
   */
  const cleanupRecording = () => {
    stopRecording();
    
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    
    setRecordingTime(0);
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setDropError(null);
  };

  /**
   * Format seconds into MM:SS display format
   */
  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Calculate remaining recording time in seconds
   */
  const getRemainingRecordingTime = (currentTime: number) => {
    const maxTime = 300; // 5 minutes in seconds
    return maxTime - currentTime;
  };
  
  /**
   * Handle submitting the recorded audio
   */
  const handleUseRecording = () => {
    if (recordedBlob) {
      // Create a File object from the Blob
      const extension = recordedBlob.type.includes('webm') ? 'webm' : 
                        recordedBlob.type.includes('ogg') ? 'ogg' : 'wav';
      
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
      const fileName = `recording_${timestamp}.${extension}`;
      
      const recordedFile = new File(
        [recordedBlob], 
        fileName, 
        { type: recordedBlob.type || 'audio/webm' }
      );
      
      // Process the recorded file using the provided callback
      onComplete(recordedFile);
      
      // Clean up
      cleanupRecording();
    }
  };
  
  /**
   * Handle the recording stop event from WaveSurferRecord
   */
  const handleRecordingStop = (blob: Blob) => {
    console.log('Recording stopped and blob received in modal:', blob);
    console.log('Blob type:', blob.type, 'Blob size:', blob.size);
    
    if (!blob || blob.size === 0) {
      console.error('Received invalid or empty blob');
      setDropError('Recording failed. Please try again.');
      return;
    }
    
    // Create the URL for audio playback
    const audioUrl = URL.createObjectURL(blob);
    console.log('Audio URL created for playback:', audioUrl);
    
    // Update state with recording data
    setRecordedBlob(blob);
    setRecordedAudioUrl(audioUrl);
    
    // Log success message
    console.log('Recording successfully captured and ready for playback');
  };
  
  // Initialize recording when component mounts
  useEffect(() => {
    console.log('RecordingModal mounted, initializing audio recording');
    initializeAudioRecording();
    
    // Clean up when component unmounts
    return () => {
      console.log('RecordingModal unmounting, cleaning up resources');
      cleanupRecording();
    };
  }, []);

  // Keep track of state changes for debugging
  useEffect(() => {
    console.log('Recording state changed:', { 
      isRecording,
      hasRecordedBlob: !!recordedBlob,
      hasRecordedUrl: !!recordedAudioUrl,
      recordingTime
    });
  }, [isRecording, recordedBlob, recordedAudioUrl, recordingTime]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[rgba(20,20,30,0.8)] border border-white/10 rounded-lg p-6 w-full max-w-md"
      >
        <h3 className="text-xl font-semibold mb-4">Record Audio</h3>
        
        {/* Microphone Selection */}
        <div className="mb-4">
          <label className="text-sm text-white/70 mb-1 block">
            Select Microphone
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => selectMicrophoneDevice(e.target.value)}
            disabled={isRecording}
            className="w-full px-3 py-2 bg-[rgba(30,30,40,0.8)] border border-white/10 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-spektr-cyan-500 focus:border-transparent"
          >
            {audioInputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}`}
              </option>
            ))}
            {audioInputDevices.length === 0 && (
              <option value="">No microphones found</option>
            )}
          </select>
        </div>
        
        {/* WaveSurfer Recording/Playback */}
        <div className="my-4">
          <label className="text-sm text-white/70 mb-1 block">
            {isRecording ? 'Recording in progress' : recordedBlob ? 'Recording preview' : 'Microphone input'}
          </label>
          <WaveSurferRecord 
            isRecording={isRecording}
            onRecordingStart={() => {
              console.log('Recording started from wavesurfer');
              // Any additional logic when recording starts
            }}
            onRecordingStop={handleRecordingStop}
            deviceId={selectedDeviceId}
            height={80}
          />
        </div>
        
        {/* Timer Display */}
        <div className="flex flex-col items-center mb-6">
          <div className="text-4xl font-mono mb-2 text-white">
            {formatRecordingTime(recordingTime)}
          </div>
          <div className="text-sm text-white/50">
            {isRecording ? 'Recording in progress' : recordedBlob ? 'Recording complete' : 'Ready to record'}
          </div>
          <div className="w-full bg-[rgba(30,30,40,0.8)] h-2 rounded-full mt-3">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isRecording 
                  ? "bg-[rgba(220,38,38,0.9)]" 
                  : recordedBlob 
                    ? "bg-[rgba(16,185,129,0.9)]" 
                    : "bg-[rgba(0,185,205,0.9)]"
              )}
              style={{ width: `${(recordingTime / 300) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-white/50 mt-1 self-end">
            {isRecording 
              ? `${formatRecordingTime(getRemainingRecordingTime(recordingTime))} remaining` 
              : recordedBlob 
                ? `${formatRecordingTime(recordingTime)} recorded` 
                : '05:00 available'
            }
          </div>
        </div>
        
        {/* Recording Controls */}
        <div className="flex justify-center gap-4 mb-6">
          {!isRecording && !recordedBlob ? (
            <ShimmerButton
              onClick={startRecording}
              disabled={audioInputDevices.length === 0}
              className="font-medium text-sm px-6 py-3"
              background="rgba(220, 38, 38, 0.9)"
              shimmerColor="rgba(255, 255, 255, 0.5)"
            >
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white" />
                Record
              </span>
            </ShimmerButton>
          ) : isRecording ? (
            <ShimmerButton
              onClick={stopRecording}
              className="font-medium text-sm px-6 py-3"
              background="rgba(60, 65, 80, 0.9)"
              shimmerColor="rgba(255, 255, 255, 0.5)"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="12" height="12" fill="white" />
                </svg>
                Stop
              </span>
            </ShimmerButton>
          ) : (
            <div className="flex gap-4">
              <ShimmerButton
                onClick={() => {
                  setRecordedBlob(null);
                  setRecordedAudioUrl(null);
                }}
                className="font-medium text-sm px-6 py-3"
                background="rgba(60, 65, 80, 0.9)"
                shimmerColor="rgba(255, 255, 255, 0.5)"
              >
                <span className="flex items-center gap-2">
                  <Mic className="w-3 h-3" />
                  Re-record
                </span>
              </ShimmerButton>
              
              <ShimmerButton
                onClick={handleUseRecording}
                className="font-medium text-sm px-6 py-3"
                background="rgba(16, 185, 129, 0.9)"
                shimmerColor="rgba(255, 255, 255, 0.5)"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Use Recording
                </span>
              </ShimmerButton>
            </div>
          )}
        </div>
        
        {/* Recording Status */}
        {isRecording && (
          <div className="text-center text-sm text-red-400 animate-pulse mb-4">
            Recording in progress...
          </div>
        )}
        
        {/* Playback Hint */}
        {recordedBlob && !isRecording && (
          <div className="text-center text-sm text-emerald-400 mb-4 p-2 bg-emerald-500/10 border border-emerald-400/20 rounded-md">
            <p className="mb-1">Your recording is ready!</p>
            <p>You can preview it using the Play button above, then choose to use it or record again.</p>
          </div>
        )}
        
        {/* Debug Info - only visible in development */}
        {process.env.NODE_ENV === 'development' && recordedBlob && (
          <div className="mb-4 p-2 bg-blue-500/10 border border-blue-400/20 rounded-md text-xs font-mono text-blue-300 break-all">
            <p>Debug: Blob captured</p>
            <p>Type: {recordedBlob.type}</p>
            <p>Size: {recordedBlob.size} bytes</p>
            {recordedAudioUrl && <p>URL: {recordedAudioUrl}</p>}
          </div>
        )}
        
        {/* Error Message */}
        {dropError && (
          <div className="text-sm text-red-500 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            {dropError}
          </div>
        )}
        
        {/* Cancel Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              cleanupRecording();
              onCancel();
            }}
            variant="secondary"
            className="text-sm bg-gray-800 text-white hover:bg-gray-700"
            disabled={isRecording}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
} 