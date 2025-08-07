/**
 * UI Types for Smart ZIP Splitter
 * Contains type definitions for UI components and interactions
 */

export type ProcessingStrategy = 'CLIENT_SIDE' | 'CLIENT_DRIVE';

export interface FileInfo {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  strategy: ProcessingStrategy;
}

export type UploadState = 'idle' | 'dragOver' | 'fileSelected' | 'processing' | 'error';

export type ProgressState = 
  | 'idle' 
  | 'analyzing' 
  | 'processing' 
  | 'uploading' 
  | 'complete' 
  | 'error';

export interface ProgressInfo {
  state: ProgressState;
  percentage: number;
  message: string;
  estimatedTime?: number;
  strategy?: ProcessingStrategy;
}

export interface UploadError {
  code: string;
  message: string;
  details?: string;
}

export interface FileUploadProps {
  onFileSelect: (fileInfo: FileInfo) => void;
  onError: (error: UploadError) => void;
  className?: string;
  disabled?: boolean;
}

export interface ProgressBarProps {
  progress: ProgressInfo;
  className?: string;
}