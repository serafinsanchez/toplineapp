import { User } from 'next-auth';

// Extend the built-in User type
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
  }

  interface Session {
    user: User;
  }
}

// Credit package type
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
}

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  credits: number;
}

// Transaction type
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  credits_added: number;
  description: string;
  created_at: string;
}

// Audio file type
export interface AudioFile {
  name: string;
  type: string;
  data: string; // base64 encoded
}

// Stem extraction result type
export interface StemExtractionResult {
  success: boolean;
  acapella: AudioFile;
  instrumental: AudioFile;
}

// Music.ai API types
export interface MusicAiUploadResponse {
  uploadUrl: string;
  downloadUrl: string;
}

export interface MusicAiJobParams {
  inputUrl: string;
}

export interface MusicAiJobRequest {
  name: string;
  workflow: string;
  params: MusicAiJobParams;
}

export interface MusicAiJobResponse {
  id: string;
  status: string;
  result?: Record<string, string>;
  error?: string;
}

export interface MusicAiStemResult {
  acapellaPath: string;
  instrumentalPath: string;
} 