"use client";

import { motion } from "framer-motion";

interface WaveformProps {
  className?: string;
  barCount?: number;
  barWidth?: string;
  barGap?: string;
  barColor?: string;
  height?: string;
  animationDuration?: number;
}

export const Waveform = ({
  className = "",
  barCount = 40,
  barWidth = "w-1 md:w-2",
  barGap = "gap-1 md:gap-2",
  barColor = "bg-gradient-to-t from-blue-400 to-indigo-300",
  height = "h-32 md:h-40",
  animationDuration = 1.5,
}: WaveformProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 1 }}
      className={`w-full relative ${height} flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`flex items-end justify-center ${barGap} h-full w-full px-4`}>
          {Array.from({ length: barCount }).map((_, i) => {
            // Create a dynamic waveform pattern
            const height = Math.sin(i * 0.2) * 0.5 + 0.5;
            return (
              <motion.div
                key={i}
                initial={{ height: "10%" }}
                animate={{ height: `${height * 100}%` }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: animationDuration + Math.random(),
                  delay: i * 0.05,
                }}
                className={`${barWidth} ${barColor} rounded-full`}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}; 