"use client";
import React from "react";
import { AuroraBackground } from "./aurora-background";
import { SparklesCore } from "./sparkles";

export function AuroraSparklesDemo() {
  return (
    <AuroraBackground className="w-full h-[40rem] flex flex-col items-center justify-center overflow-hidden">
      {/* Full-page sparkles layer with more even distribution */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <SparklesCore
          background="transparent"
          minSize={0.1}
          maxSize={0.6}
          particleDensity={800}
          className="w-full h-full"
          particleColor="#FFFFFF"
          speed={0.3}
        />
      </div>
      
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Replace the solid overlay with a gradient from darker to lighter */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/10 z-10"></div>
        
        <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
          Topline
        </h1>
        <p className="text-white/90 text-center mt-4 text-lg md:text-xl max-w-lg mx-auto relative z-20">
          <span className="text-white">Acapellas and instrumentals from any song in seconds.</span>
        </p>
        
        <div className="w-full max-w-[40rem] h-40 relative mt-8 z-20">
          {/* Gradients - keeping these in their original position */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

          {/* Core component with reduced density to avoid concentration */}
          <SparklesCore
            background="transparent"
            minSize={0.2}
            maxSize={0.7}
            particleDensity={600}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={0.4}
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="absolute inset-0 w-full h-full bg-transparent [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>
      </div>
      
      {/* Add an additional sparkle layer to ensure even distribution */}
      <div className="fixed inset-x-0 bottom-0 h-2/3 w-full z-0 pointer-events-none opacity-40">
        <SparklesCore
          background="transparent"
          minSize={0.1}
          maxSize={0.5}
          particleDensity={400}
          className="w-full h-full"
          particleColor="#FFFFFF"
          speed={0.25}
        />
      </div>
    </AuroraBackground>
  );
} 