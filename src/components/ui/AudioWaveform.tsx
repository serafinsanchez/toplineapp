"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface AudioWaveformProps {
  audioUrl: string | undefined;
  className?: string;
  waveColor?: string;
  progressColor?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
}

export function AudioWaveform({
  audioUrl,
  className = "",
  waveColor = "rgba(59, 130, 246, 0.3)",
  progressColor = "rgba(37, 99, 235, 0.9)",
  height = 80,
  barWidth = 3,
  barGap = 2,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isMounted = useRef(true);

  // Debug function
  const debug = (message: string, data?: any) => {
    console.log(`[AudioWaveform] ${message}`, data || '');
  };

  // Initialize WaveSurfer
  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);
    
    // If no valid URL, don't try to initialize
    if (!audioUrl || !containerRef.current) {
      debug('No valid URL or container ref', { audioUrl, containerRef: !!containerRef.current });
      setIsLoaded(false);
      setIsLoading(false);
      return;
    }

    debug('Initializing WaveSurfer with URL', audioUrl);
    
    // Clean up previous controller if it exists
    if (controllerRef.current) {
      controllerRef.current = null;
    }

    // Create a new abort controller for this render cycle
    // We'll avoid storing it in a ref until we're sure it won't be aborted immediately
    const abortController = new AbortController();
    
    // Ensure the container has proper dimensions before initialization
    if (containerRef.current.clientWidth === 0) {
      debug('Container has zero width, setting minimum width');
      containerRef.current.style.minWidth = '100px';
    }

    try {      
      // Clean up previous instance if it exists
      if (wavesurfer.current) {
        try {
          wavesurfer.current.pause();
          wavesurfer.current.unAll();
          wavesurfer.current = null;
        } catch (error) {
          console.error("Error removing WaveSurfer listeners:", error);
        }
      }

      // Create a new WaveSurfer instance with enhanced options
      const wsInstance = WaveSurfer.create({
        container: containerRef.current,
        waveColor,
        progressColor,
        height,
        barWidth,
        barGap,
        barRadius: 4,
        cursorWidth: 1,
        cursorColor: progressColor,
        normalize: true,
        backend: 'MediaElement',
        minPxPerSec: 100,
        hideScrollbar: false,
        autoCenter: false,
        fillParent: true,
        interact: true,
        barHeight: 1,
        fetchParams: {
          signal: abortController.signal
        }
      });

      // Now that we've successfully used the controller, we can store it
      controllerRef.current = abortController;

      // Handle errors during loading
      wsInstance.on('error', (err) => {
        debug('WaveSurfer error', err);
        if (isMounted.current) {
          setIsLoaded(false);
          setIsLoading(false);
        }
      });

      // Set up event listeners
      wsInstance.on("ready", () => {
        debug('WaveSurfer ready event fired');
        if (isMounted.current) {
          setIsLoaded(true);
          setIsLoading(false);
          setDuration(wsInstance.getDuration());
          
          // Force a slight delay before refreshing to ensure proper rendering
          setTimeout(() => {
            if (containerRef.current && containerRef.current.clientWidth > 0) {
              debug('Refreshing waveform after load');
              try {
                // Make sure we can see the beginning of the waveform clearly
                wsInstance.seekTo(0);
              } catch (e) {
                console.warn("Could not refresh waveform after load:", e);
              }
            }
          }, 100);
        }
      });
      
      wsInstance.on("play", () => {
        if (isMounted.current) {
          setIsPlaying(true);
        }
      });
      
      wsInstance.on("pause", () => {
        if (isMounted.current) {
          setIsPlaying(false);
        }
      });
      
      wsInstance.on("finish", () => {
        if (isMounted.current) {
          setIsPlaying(false);
        }
      });
      
      // Update time tracking more frequently for smoother progress
      wsInstance.on("audioprocess", () => {
        if (isMounted.current) {
          setCurrentTime(wsInstance.getCurrentTime());
        }
      });

      // Also update time on seeking - use as 'any' to bypass type issue
      wsInstance.on("seek" as any, () => {
        if (isMounted.current) {
          setCurrentTime(wsInstance.getCurrentTime());
        }
      });

      // Add click handler for direct container clicks
      if (containerRef.current) {
        containerRef.current.addEventListener('click', (e) => {
          if (isLoaded && wavesurfer.current) {
            const rect = containerRef.current!.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const percent = relX / rect.width;
            
            // Seek to the clicked position
            wavesurfer.current.seekTo(percent);
            
            // If not playing, start playback
            if (!isPlaying) {
              wavesurfer.current.play();
            }
          }
        });
      }

      // Load the audio file
      try {
        debug('Loading audio URL', audioUrl);
        wsInstance.load(audioUrl);
      } catch (error) {
        debug('Error loading audio', error);
        if (isMounted.current) {
          setIsLoaded(false);
          setIsLoading(false);
        }
      }

      wavesurfer.current = wsInstance;
    } catch (error) {
      debug('Error setting up WaveSurfer', error);
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Clean up WaveSurfer
      if (wavesurfer.current) {
        try {
          wavesurfer.current.pause(); // Ensure playback is stopped before destruction
          wavesurfer.current.unAll(); // Remove all event listeners
        } catch (error) {
          console.error("Error removing WaveSurfer listeners:", error);
        }
        
        wavesurfer.current = null;
      }
      
      // Clear refs
      controllerRef.current = null;
    };
  }, [audioUrl, waveColor, progressColor, height, barWidth, barGap]);

  // Handle property changes after initial render
  useEffect(() => {
    if (wavesurfer.current && isLoaded) {
      try {
        debug('Updating WaveSurfer with new properties', { waveColor, progressColor, height, barWidth, barGap });
        
        // Update wavesurfer options
        wavesurfer.current.setOptions({
          waveColor,
          progressColor,
          height,
          barWidth,
          barGap
        });
        
        // Get current time before updating
        let currentPos = 0;
        try {
          currentPos = wavesurfer.current.getCurrentTime() || 0;
        } catch (err) {
          debug('Error getting current time', err);
        }
        
        // Seek to beginning to refresh the waveform
        try {
          wavesurfer.current.seekTo(0);
        } catch (err) {
          debug('Error seeking to 0', err);
        }
        
        // Restore position after a delay if there was a valid position
        if (currentPos > 0) {
          setTimeout(() => {
            if (wavesurfer.current && isMounted.current) {
              try {
                const duration = wavesurfer.current.getDuration() || 0;
                // Only attempt to seek if duration is valid and greater than 0
                if (duration && isFinite(duration) && duration > 0) {
                  const seekPosition = Math.min(currentPos / duration, 0.99);
                  wavesurfer.current.seekTo(seekPosition);
                }
              } catch (err) {
                debug('Error restoring position', err);
              }
            }
          }, 100);
        }
      } catch (e) {
        console.warn("Could not update waveform properties:", e);
      }
    }
  }, [waveColor, progressColor, height, barWidth, barGap, isLoaded]);

  // Handle window resize to redraw wavesurfer
  useEffect(() => {
    const handleResize = () => {
      if (wavesurfer.current && isLoaded) {
        try {
          // Force redraw on resize
          if (typeof wavesurfer.current.setOptions === 'function') {
            wavesurfer.current.setOptions({ height });
          }
        } catch (e) {
          console.warn("Could not update waveform on resize:", e);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [height, isLoaded]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    debug('Play/Pause button clicked, isLoaded:', isLoaded);
    if (!wavesurfer.current || !isLoaded) return;
    
    try {
      wavesurfer.current.playPause();
    } catch (error) {
      console.error("Error during playPause:", error);
    }
  };

  // Add a refresh function that can be called to redraw the waveform
  const refreshWaveform = () => {
    if (wavesurfer.current && isLoaded) {
      try {
        // Update waveform display using valid methods
        const currentTime = wavesurfer.current.getCurrentTime();
        wavesurfer.current.seekTo(0);
        wavesurfer.current.seekTo(currentTime / wavesurfer.current.getDuration());
      } catch (e) {
        console.warn("Could not refresh waveform:", e);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`w-full ${className} relative`}>
      {(!audioUrl || isLoading) && !isLoaded && (
        <div className="h-20 w-full bg-gray-100/10 animate-pulse rounded-md"></div>
      )}
      
      <div className={`${(!audioUrl || !isLoaded) ? 'hidden' : 'block'} relative mb-10`}>
        <div className="flex items-center gap-3 mb-3 relative z-20">
          <button 
            onClick={handlePlayPause}
            className={`w-10 h-10 flex items-center justify-center rounded-full ${isPlaying ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white hover:text-white transition-colors duration-200 z-30 cursor-pointer active:scale-95 shadow-md`}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!isLoaded}
            type="button"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
          </button>
          
          <div className="text-xs text-gray-300 font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="relative">
          <div 
            ref={containerRef} 
            className="w-full h-20 cursor-pointer rounded-md overflow-hidden"
            aria-hidden="true"
          />
          {isPlaying && (
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500/10 pointer-events-none rounded-md" 
              style={{width: `${progressPercentage}%`}} 
            />
          )}
        </div>
      </div>
      
      {/* Fallback audio element for accessibility and non-JS browsers */}
      {audioUrl && (
        <audio controls className="sr-only" aria-label="Audio player">
          <source src={audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
} 