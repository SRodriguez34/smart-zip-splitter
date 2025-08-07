/**
 * Drive Upload Progress Component
 * Componente detallado para mostrar progreso de subida a Google Drive con funcionalidades avanzadas
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGoogleDrive, UploadProgress } from '@/hooks/use-google-drive';
import {
  Upload,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  X,
  Clock,
  Zap,
  FileText,
  ExternalLink,
  Download,
  Folder,
  AlertCircle
} from 'lucide-react';

interface DriveUploadProgressProps {
  onUploadComplete?: (result: any) => void;
  onUploadCancel?: () => void;
  showIndividualFiles?: boolean;
  className?: string;
}

export function DriveUploadProgress({
  onUploadComplete,
  onUploadCancel,
  showIndividualFiles = true,
  className = ""
}: DriveUploadProgressProps) {
  const {
    uploadProgress,
    totalUploadProgress,
    isLoading
  } = useGoogleDrive();

  const [isPaused, setIsPaused] = useState(false);
  const [showDetails, setShowDetails] = useState(showIndividualFiles);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number>(0);
  const [averageSpeed, setAverageSpeed] = useState<number>(0);

  // Calcular estadísticas de subida
  useEffect(() => {
    if (uploadProgress.length === 0) return;

    const activeUploads = uploadProgress.filter(p => p.status === 'uploading');
    const completedUploads = uploadProgress.filter(p => p.status === 'completed');
    
    if (activeUploads.length > 0) {
      // Calcular velocidad promedio
      const totalSpeed = activeUploads.reduce((sum, upload) => sum + upload.speed, 0);
      setAverageSpeed(totalSpeed);

      // Calcular tiempo estimado restante
      const remainingBytes = uploadProgress.reduce((sum, upload) => {
        return sum + (upload.total - upload.uploaded);
      }, 0);
      
      if (totalSpeed > 0) {
        setEstimatedTimeLeft(remainingBytes / totalSpeed);
      }
    }

    // Verificar si la subida está completa
    if (completedUploads.length === uploadProgress.length && uploadProgress.length > 0) {
      // Todos los archivos se han subido
      const hasErrors = uploadProgress.some(p => p.status === 'error');
      if (!hasErrors) {
        onUploadComplete?.({
          success: true,
          completed: completedUploads.length,
          total: uploadProgress.length
        });
      }
    }
  }, [uploadProgress, onUploadComplete]);

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-200';
      case 'error':
        return 'bg-red-100 border-red-200';
      case 'uploading':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const handleCancel = () => {
    if (onUploadCancel) {
      onUploadCancel();
    }
  };

  // Si no hay progreso de subida, no mostrar nada
  if (uploadProgress.length === 0) {
    return null;
  }

  const completedCount = uploadProgress.filter(p => p.status === 'completed').length;
  const errorCount = uploadProgress.filter(p => p.status === 'error').length;
  const uploadingCount = uploadProgress.filter(p => p.status === 'uploading').length;
  const totalCount = uploadProgress.length;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Uploading to Google Drive</h3>
              <p className="text-sm text-gray-600">
                {completedCount} of {totalCount} files completed
                {errorCount > 0 && (
                  <span className="text-red-600 ml-2">({errorCount} errors)</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {uploadingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progreso general */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span>{Math.round(totalUploadProgress)}%</span>
          </div>
          <Progress value={totalUploadProgress} className="h-3" />
          
          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Zap className="w-4 h-4" />
              <span>{averageSpeed > 0 ? formatSpeed(averageSpeed) : '---'}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{estimatedTimeLeft > 0 ? formatTime(estimatedTimeLeft) : '---'}</span>
            </div>
          </div>
        </div>

        {/* Toggle para mostrar detalles */}
        {totalCount > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showDetails ? 'Hide' : 'Show'} Individual Files ({totalCount})
          </Button>
        )}

        {/* Lista de archivos individuales */}
        {showDetails && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {uploadProgress.map((upload, index) => (
              <div
                key={upload.fileIndex}
                className={`p-4 rounded-lg border ${getStatusColor(upload.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(upload.status)}
                    <span className="font-medium text-sm truncate" title={upload.fileName}>
                      {upload.fileName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>{formatBytes(upload.total)}</span>
                    {upload.status === 'uploading' && upload.speed > 0 && (
                      <span className="text-blue-600">
                        {formatSpeed(upload.speed)}
                      </span>
                    )}
                  </div>
                </div>
                
                {upload.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{formatBytes(upload.uploaded)} / {formatBytes(upload.total)}</span>
                      <span>{Math.round(upload.progress)}%</span>
                    </div>
                    <Progress value={upload.progress} className="h-2" />
                  </div>
                )}
                
                {upload.status === 'completed' && (
                  <div className="text-xs text-green-600 flex items-center mt-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Upload completed successfully
                  </div>
                )}
                
                {upload.status === 'error' && upload.error && (
                  <div className="text-xs text-red-600 flex items-start mt-1">
                    <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{upload.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Resumen final cuando termine */}
        {completedCount === totalCount && totalCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-800">Upload Complete!</h4>
                <p className="text-sm text-green-600">
                  {completedCount} files uploaded successfully to Google Drive
                  {errorCount > 0 && (
                    <span className="text-red-600"> ({errorCount} failed)</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advertencias de errores */}
        {errorCount > 0 && uploadingCount === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">Upload Issues</h4>
                <p className="text-sm text-yellow-700">
                  {errorCount} file{errorCount > 1 ? 's' : ''} failed to upload. 
                  Check your internet connection and Google Drive storage quota.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}