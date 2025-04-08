import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  audioUrl: string;
  className?: string;
}

const Waveform = ({ audioUrl, className = '' }: WaveformProps) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (waveformRef.current) {
      // Cleanup previous instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      // Create WaveSurfer instance
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4F46E5',
        progressColor: '#818CF8',
        cursorColor: '#6366F1',
        cursorWidth: 2,
        height: 128,
        fillParent: true, // This makes it fill the parent container
        normalize: true,
        url: audioUrl,
      });

      wavesurferRef.current = wavesurfer;

      // Load audio
      wavesurfer.load(audioUrl);

      // Clean up
      return () => {
        wavesurfer.destroy();
      };
    }
  }, [audioUrl]);

  return (
    <div 
      ref={waveformRef} 
      className={`w-full h-32 ${className}`} // Set container size with CSS
    />
  );
};

export default Waveform; 