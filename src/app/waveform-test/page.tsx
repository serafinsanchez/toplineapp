"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AudioWaveform } from "@/components/ui/AudioWaveform";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WaveformTestPage() {
  // Sample MP3 from project root (adjust path as needed)
  const defaultAudio = "/sample-audio/sample1.mp3";
  
  // State for waveform configuration
  const [audioUrl, setAudioUrl] = useState(defaultAudio);
  const [customUrl, setCustomUrl] = useState("");
  const [waveColor, setWaveColor] = useState("rgba(59, 130, 246, 0.3)");
  const [progressColor, setProgressColor] = useState("rgba(37, 99, 235, 0.9)");
  const [height, setHeight] = useState(80);
  const [barWidth, setBarWidth] = useState(3);
  const [barGap, setBarGap] = useState(2);
  
  // Add a state to track changes
  const [changeCount, setChangeCount] = useState(0);

  // Function to update a parameter and increment change counter
  const updateParam = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setChangeCount(prev => prev + 1);
  };

  // Handle custom URL input
  const handleLoadCustomUrl = () => {
    if (customUrl.trim()) {
      setAudioUrl(customUrl);
      setChangeCount(prev => prev + 1);
    }
  };

  // Predefined audio samples
  const audioSamples = [
    { name: "Sample 1", url: "/sample-audio/sample1.mp3" },
    { name: "Sample 2", url: "/sample-audio/sample2.mp3" },
    { name: "Project Root MP3", url: "/Not_Like_Us.mp3" },
    { name: "Guitar Sample", url: "https://cdn.freesound.org/previews/172/172683_1407570-lq.mp3" },
    { name: "Piano Sample", url: "https://cdn.freesound.org/previews/467/467084_9657003-lq.mp3" },
    { name: "Vocals Sample", url: "https://cdn.freesound.org/previews/352/352177_5396737-lq.mp3" },
  ];

  return (
    <div className="container mx-auto py-10 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AudioWaveform Test Page</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
      
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Audio Source</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {audioSamples.map((sample) => (
            <Button
              key={sample.url}
              variant={audioUrl === sample.url ? "default" : "outline"}
              onClick={() => updateParam(setAudioUrl, sample.url)}
            >
              {sample.name}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Enter custom audio URL"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
          />
          <Button onClick={handleLoadCustomUrl}>Load URL</Button>
        </div>
        
        <p className="text-sm text-gray-500">Current audio: {audioUrl}</p>
      </Card>
      
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Waveform Configuration</h2>
        <p className="text-sm text-gray-500">Changes made: {changeCount}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Wave Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={waveColor}
                  onChange={(e) => updateParam(setWaveColor, e.target.value)}
                />
                <div 
                  className="w-10 h-10 rounded border" 
                  style={{ backgroundColor: waveColor }}
                ></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateParam(setWaveColor, "rgba(59, 130, 246, 0.3)")}>Blue</Button>
                <Button size="sm" onClick={() => updateParam(setWaveColor, "rgba(220, 38, 38, 0.3)")}>Red</Button>
                <Button size="sm" onClick={() => updateParam(setWaveColor, "rgba(5, 150, 105, 0.3)")}>Green</Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Progress Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={progressColor}
                  onChange={(e) => updateParam(setProgressColor, e.target.value)}
                />
                <div 
                  className="w-10 h-10 rounded border" 
                  style={{ backgroundColor: progressColor }}
                ></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateParam(setProgressColor, "rgba(37, 99, 235, 0.9)")}>Blue</Button>
                <Button size="sm" onClick={() => updateParam(setProgressColor, "rgba(185, 28, 28, 0.9)")}>Red</Button>
                <Button size="sm" onClick={() => updateParam(setProgressColor, "rgba(4, 120, 87, 0.9)")}>Green</Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Height: {height}px</Label>
              <Slider
                value={[height]}
                min={40}
                max={200}
                step={10}
                onValueChange={(value) => updateParam(setHeight, value[0])}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bar Width: {barWidth}px</Label>
              <Slider
                value={[barWidth]}
                min={1}
                max={10}
                step={1}
                onValueChange={(value) => updateParam(setBarWidth, value[0])}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bar Gap: {barGap}px</Label>
              <Slider
                value={[barGap]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) => updateParam(setBarGap, value[0])}
              />
            </div>
            
            <div className="pt-4">
              <Button 
                className="w-full" 
                onClick={() => {
                  // Reset to defaults
                  updateParam(setHeight, 80);
                  updateParam(setBarWidth, 3);
                  updateParam(setBarGap, 2);
                  updateParam(setWaveColor, "rgba(59, 130, 246, 0.3)");
                  updateParam(setProgressColor, "rgba(37, 99, 235, 0.9)");
                }}
              >
                Reset to Default
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Waveform Preview</h2>
        
        <AudioWaveform
          audioUrl={audioUrl}
          waveColor={waveColor}
          progressColor={progressColor}
          height={height}
          barWidth={barWidth}
          barGap={barGap}
        />
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Side-by-Side Comparison</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default Settings</h3>
            <AudioWaveform audioUrl={audioUrl} />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Custom Settings</h3>
            <AudioWaveform
              audioUrl={audioUrl}
              waveColor={waveColor}
              progressColor={progressColor}
              height={height}
              barWidth={barWidth}
              barGap={barGap}
            />
          </div>
        </div>
      </Card>
    </div>
  );
} 