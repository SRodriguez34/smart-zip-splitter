/**
 * Lazy-loaded components for better performance
 * These components are loaded only when needed to reduce initial bundle size
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy load Google Drive components (only loaded when user needs Drive integration)
export const LazyGoogleAuthFlow = dynamic(
  () => import('../google-auth-flow').then(mod => ({ default: mod.GoogleAuthFlow })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false // These components require browser APIs
  }
);

export const LazyDriveUploadProgress = dynamic(
  () => import('../drive-upload-progress').then(mod => ({ default: mod.DriveUploadProgress })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyShareResults = dynamic(
  () => import('../share-results').then(mod => ({ default: mod.ShareResults })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Lazy load advanced settings (only when user opens them)
export const LazyAdvancedSettings = dynamic(
  () => import('../advanced-settings').then(mod => ({ default: mod.AdvancedSettings })),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-100 rounded-lg h-32 flex items-center justify-center">
        <span className="text-gray-500">Loading settings...</span>
      </div>
    ),
    ssr: true // This can be server-side rendered
  }
);

// Lazy load heavy processing components
export const LazyZipWorker = dynamic(
  () => import('../../workers/zip-worker').then(mod => ({ default: mod.ZipWorker })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false // Web Workers are client-side only
  }
);

// Export types for TypeScript
export type LazyGoogleAuthFlowProps = ComponentType<any>;
export type LazyDriveUploadProgressProps = ComponentType<any>;
export type LazyShareResultsProps = ComponentType<any>;
export type LazyAdvancedSettingsProps = ComponentType<any>;