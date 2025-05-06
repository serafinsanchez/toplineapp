import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';
import fs from 'fs';
import path from 'path';

// Mock the necessary modules
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(null)
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/audio-processor', () => ({
  saveUploadedFile: jest.fn().mockImplementation((buffer, filename) => {
    return Promise.resolve(`/tmp/test-${filename}`);
  })
}));

describe('Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject non-multipart requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Request must be multipart/form-data');
  });

  it('should reject requests without a file', async () => {
    const formData = new FormData();
    
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data'
      },
      body: formData
    });

    // Mock the formData.get method
    request.formData = jest.fn().mockResolvedValue({
      get: () => null
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('should reject files that exceed the size limit', async () => {
    const formData = new FormData();
    
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data'
      },
      body: formData
    });

    // Mock the formData.get method
    request.formData = jest.fn().mockResolvedValue({
      get: () => ({
        name: 'test.mp3',
        size: 60 * 1024 * 1024, // 60MB (exceeds 50MB limit)
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10))
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('File size exceeds the limit (50MB)');
  });

  it('should reject unsupported file formats', async () => {
    const formData = new FormData();
    
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data'
      },
      body: formData
    });

    // Mock the formData.get method
    request.formData = jest.fn().mockResolvedValue({
      get: () => ({
        name: 'test.pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10))
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Unsupported file format. Please upload MP3, WAV, or AIFF files.');
  });

  it('should accept valid files and return a file path', async () => {
    const formData = new FormData();
    
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data'
      },
      body: formData
    });

    const mockFile = {
      name: 'test.mp3',
      size: 1024,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10))
    };

    // Mock the formData.get method
    request.formData = jest.fn().mockResolvedValue({
      get: () => mockFile
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.filePath).toBe(`/tmp/test-${mockFile.name}`);
    expect(data.fileName).toBe(mockFile.name);
    expect(data.fileSize).toBe(mockFile.size);
  });
}); 