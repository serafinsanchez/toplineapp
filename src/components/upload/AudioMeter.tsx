"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface AudioMeterProps {
  level: number; // 0 to 1
}

export function AudioMeter({ level }: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw the audio meter on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set dimensions
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = 4;
    const barGap = 2;
    const numBars = Math.floor(width / (barWidth + barGap));
    
    // Draw background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.4)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw audio level bars
    for (let i = 0; i < numBars; i++) {
      // Random height for each bar based on the level
      // More randomness at lower levels, more consistency at higher levels
      const randomness = Math.max(0, 0.7 - level) * 0.5; 
      const barLevel = level * (1 - randomness) + level * randomness * Math.random();
      
      // Calculate bar height
      let barHeight = barLevel * height;
      
      // Add some variation based on position for more interesting visuals
      const positionFactor = 0.7 + 0.3 * Math.sin((i / numBars) * Math.PI);
      barHeight *= positionFactor;
      
      // Calculate x position
      const x = i * (barWidth + barGap);
      
      // Calculate gradient color based on level
      let color;
      if (barLevel < 0.3) {
        color = 'rgba(0, 185, 205, 0.7)'; // spektr-cyan for low levels
      } else if (barLevel < 0.6) {
        color = 'rgba(59, 130, 246, 0.7)'; // blue for medium levels
      } else {
        color = 'rgba(234, 88, 12, 0.7)'; // orange for high levels
      }
      
      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    }
  }, [level]);
  
  return (
    <div className="w-full h-24 rounded-md overflow-hidden my-4 relative">
      <canvas 
        ref={canvasRef}
        width={500}
        height={100}
        className="w-full h-full"
      />
      <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-md"></div>
    </div>
  );
} 