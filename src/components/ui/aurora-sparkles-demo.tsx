"use client";
import React from "react";
import { AuroraBackground } from "./aurora-background";
import { SparklesCore } from "./sparkles";

export function AuroraSparklesDemo() {
  return (
    <AuroraBackground className="w-full h-[40rem] flex flex-col items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Replace the solid overlay with a gradient from darker to lighter */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/5 z-10"></div>
        
        <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
          Topline
        </h1>
        <p className="text-white/80 text-center mt-4 text-lg md:text-xl max-w-lg mx-auto relative z-20">
          <span className="text-black">Acapellas and instrumentals from any song in seconds.</span>
        </p>
        
        <div className="w-full max-w-[40rem] h-40 relative mt-8 z-20">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

          {/* Core component */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={1200}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={1}
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="absolute inset-0 w-full h-full bg-transparent [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>
      </div>
    </AuroraBackground>
  );
} 