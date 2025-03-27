"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, CheckCircle, XCircle, Music, Trash2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";
import { FileDetails, StemExtractionResult } from "@/types";
import axios from "axios";
import { ExtractedStemsDisplay } from "./ExtractedStemsDisplay";
import { SparklesCore } from "@/components/ui/sparkles";
import { ProcessingStatus } from "./ProcessingStatus";
import { useSession } from "next-auth/react";
import { CREDIT_REFRESH_EVENT } from "@/components/layout/Header";
import { uploadFileToStorage } from "@/lib/supabase";
import { uploadLargeFileToSupabase } from "@/lib/upload-helpers";

export function UploadArea() {
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [isValidFile, setIsValidFile] = useState<boolean | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [extractedStems, setExtractedStems] = useState<StemExtractionResult | null>(null);
  const [freeTrialUsed, setFreeTrialUsed] = useState<boolean>(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Handle the "Get Stems" button click
  const handleGetStems = async () => {
    if (!fileDetails || !isValidFile) return;
    
    try {
      // First check if user has enough credits (if authenticated)
      if (isAuthenticated) {
        const creditCheckResponse = await axios.get('/api/credits');
        if (creditCheckResponse.data.credits < 1) {
          setProcessingError('Not enough credits');
          return;
        }
      }
      
      setIsProcessing(true);
      setProcessingError(null);
      setExtractedStems(null);
      
      // Prepare request payload
      console.log("File details:", {
        name: fileDetails.name,
        size: fileDetails.size,
        type: fileDetails.type,
        path: fileDetails.path,
        hasUrl: !!fileDetails.url,
        isSupabaseStorage: fileDetails.isSupabaseStorage
      });
      
      // Send the file URL or path
      let processRequest;
      if (fileDetails.url) {
        console.log(`Using URL for processing: ${fileDetails.url.substring(0, 50)}...`);
        processRequest = { url: fileDetails.url };
      } else {
        console.log(`Using file path for processing: ${fileDetails.path}`);
        processRequest = { url: fileDetails.path };
      }
      
      console.log("Starting processing job with request:", processRequest);
      
      // Start the processing job
      const startResponse = await axios.post('/api/process-start', processRequest, {
        timeout: 60000 // Increase timeout to 60 seconds for large files
      });
      
      if (!startResponse.data.success) {
        throw new Error(startResponse.data.error || 'Failed to start processing');
      }
      
      const processId = startResponse.data.processId;
      console.log(`Processing started with ID: ${processId}`);
      
      // Step 2: Poll for job status
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // Increase max attempts
      
      while (!completed && attempts < maxAttempts) {
        attempts++;
        
        try {
          // Wait 5 seconds between polls for more stability
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check the job status
          console.log(`Checking status for process ID: ${processId} (attempt ${attempts}/${maxAttempts})`);
          const statusResponse = await axios.get(`/api/process-status?processId=${processId}`, {
            timeout: 30000 // 30 seconds timeout for status check
          });
          
          const statusData = statusResponse.data;
          console.log(`Status response:`, statusData);
          
          if (statusData.status === 'COMPLETED') {
            completed = true;
            
            // Process the completed job
            // Get file name without extension
            const fileNameWithoutExt = fileDetails.name.substring(0, fileDetails.name.lastIndexOf('.')) || fileDetails.name;
            
            // Validate that response data contains the expected structure
            const hasAcapellaData = statusData.acapella && 
                                  typeof statusData.acapella === 'object' && 
                                  typeof statusData.acapella.data === 'string';
                                  
            const hasInstrumentalData = statusData.instrumental && 
                                      typeof statusData.instrumental === 'object' && 
                                      typeof statusData.instrumental.data === 'string';
            
            if (!hasAcapellaData || !hasInstrumentalData) {
              console.error('Invalid response structure from status check');
              throw new Error('Invalid response data');
            }
            
            // Create explicit type values for safety
            const acapellaType = typeof statusData.acapella.type === 'string' 
              ? statusData.acapella.type 
              : 'audio/wav';
              
            const instrumentalType = typeof statusData.instrumental.type === 'string'
              ? statusData.instrumental.type
              : 'audio/wav';
            
            // Create object URLs for the audio files
            const acapellaBlob = base64ToBlob(
              statusData.acapella.data, 
              'audio/mp3'
            );
            
            const instrumentalBlob = base64ToBlob(
              statusData.instrumental.data, 
              'audio/mp3'
            );
            
            // Update the extracted stems with URLs and custom file names
            setExtractedStems({
              success: true,
              acapella: {
                data: typeof statusData.acapella.data === 'string' ? statusData.acapella.data : '',
                url: URL.createObjectURL(acapellaBlob),
                name: `${fileNameWithoutExt}_acapella.mp3`,
                type: 'audio/mp3'
              },
              instrumental: {
                data: typeof statusData.instrumental.data === 'string' ? statusData.instrumental.data : '',
                url: URL.createObjectURL(instrumentalBlob),
                name: `${fileNameWithoutExt}_instrumental.mp3`,
                type: 'audio/mp3'
              }
            });
            
            console.log('Processing completed successfully!');
            
            // Refresh credits in the header after successful extraction
            if (isAuthenticated && typeof window !== 'undefined') {
              try {
                // Dispatch the credit refresh event with proper configuration
                // Note: Some browsers need the event to be explicitly set as bubbling and cancelable
                const creditRefreshEvent = new CustomEvent(CREDIT_REFRESH_EVENT, {
                  bubbles: true,
                  cancelable: true,
                  detail: { timestamp: Date.now() }
                });
                window.dispatchEvent(creditRefreshEvent);
                console.log('Credit refresh event dispatched');
              } catch (refreshError) {
                console.error('Error dispatching credit refresh event:', refreshError);
              }
            }
          } else if (statusData.status === 'FAILED') {
            completed = true;
            throw new Error(statusData.error || 'Processing failed');
          } else {
            // Still processing, continue polling
            console.log(`Processing status: ${statusData.status || 'unknown'}`);
          }
        } catch (pollError: any) {
          if (pollError.response && pollError.response.status === 404) {
            // Job not found, stop polling
            throw new Error('Processing job not found');
          }
          
          // For transient errors, continue polling
          console.warn(`Poll attempt ${attempts} failed:`, pollError.message);
          
          // If we've reached max attempts, throw an error
          if (attempts >= maxAttempts) {
            throw new Error('Processing is taking too long');
          }
        }
      }
      
      // If we've reached max attempts without completion, throw timeout error
      if (!completed) {
        throw new Error('Processing timed out. Please try again with a shorter audio file.');
      }
    } catch (error: any) {
      console.error('Error extracting stems:', error);
      
      // Handle error response
      if (error.response) {
        // Get error message from response
        const errorMessage = error.response.data?.error || 'Failed to extract stems';
        setProcessingError(errorMessage);
        
        // If it's a 403 error and we've already used the free trial, stop processing immediately
        if (error.response.status === 403 && errorMessage.includes('already jammed with our free trial')) {
          console.log('Free trial already used');
        } else if (error.response.status === 504 || error.message.includes('timeout')) {
          // Handle Gateway Timeout specifically with a more user-friendly message
          setProcessingError('The process is taking too long. Please try with a shorter audio file (under 5 minutes).');
        }
      } else if (error.request) {
        // The request was made but no response was received
        setProcessingError('No response received from server. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request
        setProcessingError(error.message || 'Failed to extract stems');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Convert base64 to Blob with better error handling
  const base64ToBlob = (base64: string, type: string): Blob => {
    try {
      // Strict validation to prevent the "includes is not a function" error
      if (typeof base64 !== 'string') {
        console.error('Invalid base64 data type:', typeof base64);
        return new Blob([], { type: type || 'audio/wav' });
      }

      if (!base64 || base64.length === 0) {
        console.error('Empty base64 data');
        return new Blob([], { type: type || 'audio/wav' });
      }
      
      // Ensure MIME type is a string
      const safeType = typeof type === 'string' && type.length > 0 
        ? type 
        : 'audio/wav';
      
      try {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new Blob([bytes], { type: safeType });
      } catch (atobError) {
        console.error('Error in atob conversion:', atobError);
        // If atob fails, it's not a valid base64 string
        return new Blob([], { type: safeType });
      }
    } catch (error: any) {
      console.error('Fatal error converting base64 to blob:', error);
      // Return an empty blob as fallback
      return new Blob([], { type: 'audio/wav' });
    }
  };

  // Process file function to handle files from any source
  const processFile = (file: File) => {
    console.log("Processing file:", file);
    console.log("File type:", file.type);
    console.log("File size:", formatFileSize(file.size));
    
    // Clear previous errors and results
    setDropError(null);
    setProcessingError(null);
    setExtractedStems(null);
    
    // More permissive validation for file types
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/aiff", "audio/x-aiff"];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ["mp3", "wav", "aiff"].includes(fileExtension || "");
    
    // Accept either by MIME type or by extension
    const isValid = validTypes.includes(file.type) || isValidExtension;
    console.log("Is valid file:", isValid, "Extension:", fileExtension);

    if (!isValid) {
      setDropError(`File type '${file.type}' not supported. Please upload MP3, WAV, or AIFF files.`);
      return;
    }
    
    // Set loading state
    setIsValidFile(null);
    
    // File size threshold for using different upload methods
    const fileSizeThreshold = 4 * 1024 * 1024; // 4MB
    
    // For smaller files, use the standard API upload endpoint
    if (file.size <= fileSizeThreshold) {
      handleSmallFileUpload(file);
    } else {
      // For larger files, use appropriate method based on auth state
      if (isAuthenticated) {
        handleAuthenticatedLargeFileUpload(file);
      } else {
        handleUnauthenticatedLargeFileUpload(file);
      }
    }
  };

  // Handle small file uploads via the normal API endpoint
  const handleSmallFileUpload = (file: File) => {
    // Create a FormData object to upload the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload the file to get the file path
    axios.post('/api/upload', formData)
      .then(response => {
        if (response.data.success) {
          setFileDetails({
            name: file.name,
            size: file.size,
            type: file.type,
            path: response.data.filePath,
            isSupabaseStorage: false
          });
          setIsValidFile(true);
          
          // Check free trial status for non-authenticated users
          if (!isAuthenticated) {
            checkFreeTrialStatus();
          } else {
            setFreeTrialUsed(false);
          }
        } else {
          setDropError(response.data.error || 'Failed to upload file');
          setIsValidFile(false);
        }
      })
      .catch(error => {
        console.error('Error uploading file:', error);
        setDropError(error.response?.data?.error || error.message || 'Failed to upload file');
        setIsValidFile(false);
      });
  };

  // Handle large file uploads for authenticated users
  const handleAuthenticatedLargeFileUpload = (file: File) => {
    console.log("User authenticated, using direct Supabase upload");
    
    // Use direct Supabase upload for all users (both logged in and logged out)
    // This completely bypasses the Vercel serverless functions
    uploadLargeFileToSupabase(
      file, 
      'audio-uploads', 
      'uploads',
      (progress) => {
        // Update progress in UI if needed
        console.log(`Upload progress: ${Math.round(progress * 100)}%`);
      }
    )
    .then(result => {
      if (result.success && result.url && result.filePath) {
        // Verify the upload with our backend
        return axios.post('/api/upload-verify', { filePath: result.filePath })
          .then(verifyResponse => {
            if (verifyResponse.data.success) {
              return {
                success: true,
                filePath: result.filePath,
                url: verifyResponse.data.url || result.url
              };
            } else {
              throw new Error('Failed to verify upload');
            }
          })
          .catch(verifyError => {
            console.warn('Upload verification warning:', verifyError);
            // Continue even if verification fails, using the original result
            return {
              success: true,
              filePath: result.filePath,
              url: result.url,
              verified: false
            };
          });
      } else {
        throw new Error(result.error?.message || 'Failed to upload file to storage');
      }
    })
    .then(result => {
      setFileDetails({
        name: file.name,
        size: file.size,
        type: file.type,
        path: result.filePath,
        url: result.url,
        isSupabaseStorage: true
      });
      setIsValidFile(true);
      setFreeTrialUsed(false); // Authenticated users use credits, not free trial
    })
    .catch(error => {
      console.error('Error uploading to Supabase:', error);
      setDropError(error.message || 'Failed to upload file. Please try again.');
      setIsValidFile(false);
    });
  };

  // Handle large file uploads for unauthenticated users
  const handleUnauthenticatedLargeFileUpload = (file: File) => {
    console.log("User not authenticated, using direct Supabase upload");
    
    // Track upload progress for UI feedback
    setIsValidFile(null);
    
    // Use direct Supabase upload for all users (both logged in and logged out)
    // This completely bypasses the Vercel serverless functions
    uploadLargeFileToSupabase(
      file, 
      'audio-uploads', 
      'uploads',
      (progress) => {
        // Update progress in UI if needed
        console.log(`Upload progress: ${Math.round(progress * 100)}%`);
      }
    )
    .then(result => {
      if (result.success && result.url && result.filePath) {
        // Verify the upload with our backend
        return axios.post('/api/upload-verify', { filePath: result.filePath })
          .then(verifyResponse => {
            if (verifyResponse.data.success) {
              return {
                success: true,
                filePath: result.filePath,
                url: verifyResponse.data.url || result.url
              };
            } else {
              throw new Error('Failed to verify upload');
            }
          })
          .catch(verifyError => {
            console.warn('Upload verification warning:', verifyError);
            // Continue even if verification fails, using the original result
            return {
              success: true,
              filePath: result.filePath,
              url: result.url,
              verified: false
            };
          });
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    })
    .then(result => {
      setFileDetails({
        name: file.name,
        size: file.size,
        type: file.type,
        path: result.filePath,
        url: result.url,
        isSupabaseStorage: true
      });
      setIsValidFile(true);
      
      // Check free trial status
      checkFreeTrialStatus();
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      
      setDropError(error.message || 'Failed to upload file. Please try again.');
      setIsValidFile(false);
    });
  };

  // Helper to check free trial status
  const checkFreeTrialStatus = () => {
    axios.get('/api/free-trial/check')
      .then(freeTrialResponse => {
        setFreeTrialUsed(freeTrialResponse.data.used === true);
      })
      .catch(error => {
        console.error('Error checking free trial status:', error);
      });
  };

  // Add global drag event listeners
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDraggingFile(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set dragging to false if we're leaving the document
      if (!e.relatedTarget || !(e.relatedTarget instanceof Node && document.body.contains(e.relatedTarget))) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
      
      // Handle files dropped anywhere on the document
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
      }
    };

    // Add event listeners to the document
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      // Clean up event listeners
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log("React-dropzone onDrop called:", acceptedFiles, "Rejected:", rejectedFiles);
    
    if (rejectedFiles.length > 0) {
      console.log("Rejected files:", rejectedFiles);
      setDropError("File type not supported. Please upload MP3, WAV, or AIFF files.");
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      processFile(file);
    }
  }, []);

  const handleManualFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      processFile(file);
    }
  };

  // Custom drop handler for the dropzone div
  const handleDropOnZone = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("File dropped directly on zone");
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
    
    setIsDraggingFile(false);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/x-wav': ['.wav'],
      'audio/aiff': ['.aiff'],
      'audio/x-aiff': ['.aiff'],
    },
    maxFiles: 1,
    noClick: true, // Disable click opening to handle it manually
    noKeyboard: true, // Disable keyboard navigation
    preventDropOnDocument: false, // Allow drops on document
    noDrag: false, // Allow drag and drop
    disabled: false, // Never disable the dropzone
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const resetFile = useCallback(() => {
    console.log("Resetting file state");
    // Force update by cloning and updating in one batch
    setFileDetails(null);
    setIsValidFile(null);
    setDropError(null);
    setProcessingError(null);
    setExtractedStems(null);
    
    // Clear the file input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Force re-render if needed
    setTimeout(() => {
      console.log("State after reset:", {
        fileDetails: null,
        isValidFile: null,
        dropError: null
      });
      // Force react to re-render by setting state again if needed
      if (fileDetails !== null) {
        setFileDetails(null);
      }
    }, 10);
  }, [fileDetails]);

  const handleReplaceFile = () => {
    console.log("Replace button clicked - handleReplaceFile called");
    // Keep the UI open but clear the current file
    setFileDetails(null);
    setIsValidFile(null);
    setDropError(null);
    // Use the open function from react-dropzone to open the file dialog
    setTimeout(() => {
      console.log("Opening file dialog");
      open();
    }, 50);
  };

  const handleDropzoneClick = (e: React.MouseEvent) => {
    // Only open if clicking on the dropzone itself, not on buttons or file info
    if (e.target === e.currentTarget) {
      console.log("Dropzone clicked, opening file dialog");
      open();
    }
  };

  // Update this function to properly handle the error message 
  const renderErrorWithLink = (errorMessage: string) => {
    // Check if the error message is the free trial message
    if (errorMessage.includes('already jammed with our free trial')) {
      return (
        <p className="text-red-500">
          Looks like you've already jammed with our free trial!{' '}
          <button 
            type="button"
            className="text-blue-500 underline font-medium hover:text-blue-700 cursor-pointer"
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup`;
            }}
          >
            Create an account
          </button>{' '}
          to unlock more access.
        </p>
      );
    }
    
    // For other error messages, return as is
    return <p className="text-red-500">{errorMessage}</p>;
  };

  // Handle signup navigation
  const handleSignUp = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        {/* Separate file input outside of dropzone */}
        <input 
          type="file" 
          id="manual-file-input"
          ref={fileInputRef}
          accept=".mp3,.wav,.aiff"
          onChange={(e) => {
            console.log("File input change event triggered");
            handleManualFileSelect(e);
          }}
          style={{ display: 'none' }}
        />
        
        {/* Only show file details if stems are not extracted yet */}
        {fileDetails && !extractedStems ? (
          // When file is uploaded but stems not extracted, show file details
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "w-full h-64 border-2 rounded-lg flex flex-col items-center justify-center p-6",
              isValidFile === true && !freeTrialUsed ? "border-blue-400 bg-blue-50/5" : "",
              isValidFile === true && freeTrialUsed ? "border-blue-400 bg-blue-50/10" : "",
              isValidFile === false ? "border-red-500 bg-red-50/10" : "border-border"
            )}
          >
            {isValidFile ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <CheckCircle className="w-12 h-12 text-blue-400" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <XCircle className="w-12 h-12 text-red-500" />
              </motion.div>
            )}
            <p className="text-lg font-medium">{fileDetails.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(fileDetails.size)}
            </p>
            {isValidFile && !freeTrialUsed && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-blue-300 mt-2 flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4 text-blue-300" /> Ready for stem separation!
              </motion.p>
            )}
            {isValidFile && freeTrialUsed && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-blue-300 mt-2 flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4 text-blue-300" /> Valid file! Sign up to extract stems.
              </motion.p>
            )}
            {!isValidFile && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-red-500 mt-2"
              >
                {dropError || "Invalid file format. Please upload MP3, WAV, or AIFF files only."}
              </motion.p>
            )}
            
            <div className="flex gap-2 mt-4">
              <ShimmerButton 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Shimmer reset button clicked");
                  resetFile();
                }}
                className="font-medium text-sm px-3 py-1"
                background="rgba(60, 65, 80, 0.6)"
                shimmerColor="rgba(180, 185, 210, 0.5)"
              >
                <span className="flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Reset
                </span>
              </ShimmerButton>
            </div>
          </motion.div>
        ) : !fileDetails && !extractedStems ? (
          // When no file is uploaded and no stems extracted, show the dropzone
          <div
            ref={dropzoneRef}
            {...getRootProps()}
            className={cn(
              "w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 transition-all duration-300 cursor-pointer relative",
              (isDragActive || isDraggingFile) ? "border-primary bg-primary/10 scale-[1.02] shadow-lg" : "border-border"
            )}
          >
            <input {...getInputProps()} />
            <Upload className={cn(
              "w-12 h-12 mb-4 transition-colors duration-300",
              (isDragActive || isDraggingFile) ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-lg text-center mb-2">
              {(isDragActive || isDraggingFile)
                ? "Drop your audio file here..." 
                : "Drag and drop your audio file here"}
            </p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Supported formats: MP3, WAV, AIFF
            </p>
            
            <div className="relative z-30">
              <ShimmerButton
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log("Select from computer button clicked");
                  // Use our own file input instead of dropzone's open function
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className="font-medium text-sm px-3 py-1"
                background="rgba(60, 65, 80, 0.6)"
                shimmerColor="rgba(180, 185, 210, 0.5)"
              >
                <span className="flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Select from computer
                </span>
              </ShimmerButton>
            </div>
            
            {dropError && (
              <p className="text-sm text-red-500 mt-4">{dropError}</p>
            )}
          </div>
        ) : extractedStems && fileDetails ? (
          // When stems are extracted, show a simplified file info
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full border-2 rounded-lg border-border bg-background/50 p-4 flex items-center justify-center"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-blue-400" />
              <div>
                <p className="font-medium">{fileDetails.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(fileDetails.size)}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Display extracted stems if available */}
        {extractedStems && <ExtractedStemsDisplay extractedStems={extractedStems} />}
        
        {/* Display processing status if processing */}
        {isProcessing && (
          <ProcessingStatus 
            isProcessing={isProcessing} 
            onComplete={() => {
              // This is just for visual effect - the actual state change happens in handleGetStems
              console.log("Visual processing complete");
            }}
          />
        )}
        
        {/* Display free trial used message if applicable */}
        {freeTrialUsed && !processingError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="w-full mt-4 p-4 border-2 border-blue-400 rounded-lg bg-blue-50/10"
          >
            <p className="text-center">
              <span className="font-medium text-blue-400">Thanks for trying it out!</span>{' '}
              <span className="text-muted-foreground">
                Sign up to add extract more stems.
              </span>
            </p>
          </motion.div>
        )}
        
        {/* Display processing error if any */}
        {processingError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="w-full mt-4 p-4 border-2 border-red-500 rounded-lg bg-red-50/10"
          >
            {renderErrorWithLink(processingError)}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1,
            y: 0 
          }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mt-6 w-full flex justify-center gap-4 relative"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Sparkles effect under the button */}
          {!extractedStems && fileDetails && isValidFile && !isProcessing && (
            <div className="absolute -bottom-10 w-full h-20 pointer-events-none">
              <SparklesCore
                background="transparent"
                minSize={0.4}
                maxSize={1.2}
                particleDensity={70}
                className="w-full h-full"
                particleColor="#5D8BF4"
                speed={0.8}
              />
              
              {/* Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-10 bg-blue-500/20 blur-xl rounded-full"></div>
            </div>
          )}
          
          {!extractedStems ? (
            // Only show "Get Stems" button if there's a valid file and not currently processing
            fileDetails && isValidFile && !isProcessing ? (
              freeTrialUsed ? (
                <ShimmerButton 
                  onClick={handleSignUp}
                  className="font-medium relative"
                  background="rgba(25, 55, 125, 0.4)"
                  shimmerColor="rgba(138, 180, 248, 0.8)"
                >
                  <span className="flex items-center gap-2">
                    Sign Up Now <ArrowRight className="w-4 h-4" />
                  </span>
                  
                  {/* Additional glow effect on hover */}
                  <div className={cn(
                    "absolute inset-0 -z-10 rounded-md transition-opacity duration-300",
                    isHovering ? "opacity-100" : "opacity-0"
                  )}>
                    <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-md"></div>
                  </div>
                </ShimmerButton>
              ) : (
                <ShimmerButton 
                  onClick={handleGetStems}
                  className="font-medium relative"
                  background="rgba(25, 55, 125, 0.4)"
                  shimmerColor="rgba(138, 180, 248, 0.8)"
                >
                  <span className="flex items-center gap-2">
                    Get Stems <Music className="w-4 h-4" />
                  </span>
                  
                  {/* Additional glow effect on hover */}
                  <div className={cn(
                    "absolute inset-0 -z-10 rounded-md transition-opacity duration-300",
                    isHovering ? "opacity-100" : "opacity-0"
                  )}>
                    <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-md"></div>
                  </div>
                </ShimmerButton>
              )
            ) : null
          ) : (
            // Show "Start Over" button if stems have been extracted
            <ShimmerButton 
              onClick={resetFile}
              className="font-medium"
              background="rgba(60, 65, 80, 0.6)"
              shimmerColor="rgba(180, 185, 210, 0.5)"
            >
              <span className="flex items-center gap-2">
                Upload New Song <Upload className="w-4 h-4" />
              </span>
            </ShimmerButton>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
} 