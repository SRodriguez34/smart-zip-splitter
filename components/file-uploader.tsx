/**
 * FileUploader Component
 * Drag & drop file uploader with validation and preview
 */
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileArchive, 
  AlertCircle, 
  CheckCircle, 
  X,
  HardDrive,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { FileUploadProps, FileInfo, UploadError, ProcessingStrategy } from '@/types/ui';

/**
 * Determines processing strategy based on file size
 * Files > 100MB use CLIENT_DRIVE, smaller files use CLIENT_SIDE
 */
const determineStrategy = (size: number): ProcessingStrategy => {
  const THRESHOLD = 100 * 1024 * 1024; // 100MB
  return size > THRESHOLD ? 'CLIENT_DRIVE' : 'CLIENT_SIDE';
};

/**
 * Formats file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validates if file is a valid ZIP file
 */
const validateFile = (file: File): UploadError | null => {
  // Check file type
  if (!file.type.includes('zip') && !file.name.toLowerCase().endsWith('.zip')) {
    return {
      code: 'INVALID_TYPE',
      message: 'Invalid file type',
      details: 'Only ZIP files are supported. Please select a .zip file.'
    };
  }

  // Check file size (max 10GB)
  const MAX_SIZE = 10 * 1024 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: 'File too large',
      details: 'Maximum file size is 10GB. Please select a smaller file.'
    };
  }

  // Check minimum size (1KB)
  if (file.size < 1024) {
    return {
      code: 'FILE_TOO_SMALL',
      message: 'File too small',
      details: 'File appears to be empty or corrupted. Please select a valid ZIP file.'
    };
  }

  return null;
};

export function FileUploader({ onFileSelect, onError, className, disabled }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [error, setError] = useState<UploadError | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Clear previous state
    setError(null);
    setSelectedFile(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const error: UploadError = {
        code: 'FILE_REJECTED',
        message: 'File rejected',
        details: rejection.errors[0]?.message || 'File was rejected'
      };
      setError(error);
      onError(error);
      return;
    }

    // Handle accepted file
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      if (!file) return;
      
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onError(validationError);
        return;
      }

      // Create file info
      const fileInfo: FileInfo = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        strategy: determineStrategy(file.size),
      };

      setSelectedFile(fileInfo);
      onFileSelect(fileInfo);
    }
  }, [onFileSelect, onError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    multiple: false,
    disabled: disabled || false,
    noClick: false,
    noKeyboard: false,
  });

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div
              {...getRootProps()}
              className={`
                relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
                ${isDragActive && !isDragReject ? 'border-upload-dragover-border bg-upload-dragover' : ''}
                ${isDragReject ? 'border-status-error-border bg-status-error' : ''}
                ${!isDragActive && !isDragReject ? 'border-upload-idle-border bg-upload-idle hover:border-upload-hover-border hover:bg-upload-hover' : ''}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
              aria-label="Drop ZIP file here or click to browse"
              role="button"
              tabIndex={0}
            >
              <input {...getInputProps()} aria-describedby="file-upload-description" />
              
              {/* Upload Icon with Animation */}
              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
                className="mx-auto mb-4"
              >
                {isDragReject ? (
                  <AlertCircle className="mx-auto h-16 w-16 text-status-error-border" />
                ) : (
                  <Upload className="mx-auto h-16 w-16 text-slate-400" />
                )}
              </motion.div>

              {/* Upload Text */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {isDragActive ? 
                    (isDragReject ? 'Invalid file type' : 'Drop your ZIP file here') :
                    'Drop your ZIP file here'
                  }
                </h3>
                <p id="file-upload-description" className="text-sm text-slate-600 dark:text-slate-400">
                  or <span className="font-medium text-brand-primary">click to browse</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Supports ZIP files up to 10GB
                </p>
              </div>

              {/* Processing Strategy Info */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center space-x-2 rounded-lg bg-brand-primary-light p-3">
                  <Zap className="h-5 w-5 text-brand-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">Files under 100MB</p>
                    <p className="text-xs text-slate-600">Instant client-side processing</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg bg-brand-accent-light p-3">
                  <HardDrive className="h-5 w-5 text-brand-accent" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">Files over 100MB</p>
                    <p className="text-xs text-slate-600">Smart Google Drive integration</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-upload-selected-border bg-upload-selected">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary">
                      <FileArchive className="h-6 w-6 text-white" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {selectedFile.name}
                        </h3>
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <p>Size: <span className="font-medium">{formatFileSize(selectedFile.size)}</span></p>
                        <p>Modified: <span className="font-medium">
                          {new Date(selectedFile.lastModified).toLocaleDateString()}
                        </span></p>
                      </div>

                      {/* Strategy Badge */}
                      <div className="flex items-center space-x-2">
                        <div className={`
                          inline-flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-medium
                          ${selectedFile.strategy === 'CLIENT_SIDE' 
                            ? 'bg-brand-primary-light text-brand-primary' 
                            : 'bg-brand-accent-light text-brand-accent'
                          }
                        `}>
                          {selectedFile.strategy === 'CLIENT_SIDE' ? (
                            <>
                              <Zap className="h-3 w-3" />
                              <span>Lightning Fast</span>
                            </>
                          ) : (
                            <>
                              <HardDrive className="h-3 w-3" />
                              <span>Smart Integration</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="h-8 w-8 text-slate-500 hover:text-slate-700"
                    aria-label="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <Card className="border-status-error-border bg-status-error">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-status-error-border flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{error.message}</p>
                    <p className="text-sm text-slate-600">{error.details}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}