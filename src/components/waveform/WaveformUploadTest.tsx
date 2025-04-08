import { useState, useRef } from 'react';
import Waveform from './Waveform';

const WaveformUploadTest = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create URL for the uploaded file
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setFileName(file.name);
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Waveform Upload Test</h2>
      
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
      </div>

      {audioUrl && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">File:</span> {fileName}
            </p>
            <Waveform audioUrl={audioUrl} className="rounded border border-gray-200" />
          </div>
          
          <audio controls src={audioUrl} className="w-full" />
          
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default WaveformUploadTest; 