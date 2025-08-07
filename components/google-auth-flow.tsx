/**
 * Google Authentication Flow Component
 * Componente completo para autenticación con Google Drive con UI intuitiva y manejo de errores
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGoogleDrive } from '@/hooks/use-google-drive';
import { 
  Shield, 
  Cloud, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  User, 
  LogOut,
  HardDrive,
  FileText,
  Share2
} from 'lucide-react';

interface GoogleAuthFlowProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
  showPermissionDetails?: boolean;
  className?: string;
}

export function GoogleAuthFlow({ 
  onAuthSuccess, 
  onAuthError, 
  showPermissionDetails = true,
  className = "" 
}: GoogleAuthFlowProps) {
  const {
    isInitialized,
    isLoading,
    isSignedIn,
    currentUser,
    quotaInfo,
    signIn,
    signOut,
    checkQuota
  } = useGoogleDrive();

  const [authError, setAuthError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(showPermissionDetails);

  // Verificar cuota al autenticarse
  useEffect(() => {
    if (isSignedIn && currentUser && !quotaInfo) {
      checkQuota();
    }
  }, [isSignedIn, currentUser, quotaInfo, checkQuota]);

  // Manejar autenticación exitosa
  useEffect(() => {
    if (isSignedIn && currentUser) {
      onAuthSuccess?.();
      setAuthError(null);
    }
  }, [isSignedIn, currentUser, onAuthSuccess]);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(message);
      onAuthError?.(message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getQuotaPercentage = (): number => {
    if (!quotaInfo || quotaInfo.total === 0) return 0;
    return (quotaInfo.used / quotaInfo.total) * 100;
  };

  // Estado: No inicializado
  if (!isInitialized && isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Initializing Google Drive...</span>
        </div>
      </Card>
    );
  }

  // Estado: Usuario autenticado
  if (isSignedIn && currentUser) {
    return (
      <Card className={`p-6 bg-green-50 border-green-200 ${className}`}>
        <div className="space-y-4">
          {/* Información del usuario */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full"
              />
              <CheckCircle className="absolute -bottom-1 -right-1 w-5 h-5 text-green-600 bg-white rounded-full" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">{currentUser.name}</h3>
              <p className="text-sm text-green-600">{currentUser.email}</p>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected to Google Drive
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Información de cuota */}
          {quotaInfo && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-800 flex items-center">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Storage Quota
                </h4>
                <span className="text-sm text-gray-600">
                  {formatBytes(quotaInfo.available)} available
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    getQuotaPercentage() > 90 ? 'bg-red-500' :
                    getQuotaPercentage() > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(getQuotaPercentage(), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatBytes(quotaInfo.used)} used</span>
                <span>{formatBytes(quotaInfo.total)} total</span>
              </div>
              {getQuotaPercentage() > 90 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Warning: Storage quota is almost full
                </div>
              )}
            </div>
          )}

          {/* Permisos activos */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Active Permissions
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-3 h-3 mr-2" />
                Upload files to Google Drive
              </div>
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-3 h-3 mr-2" />
                Create and manage Google Sheets
              </div>
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-3 h-3 mr-2" />
                Share files and folders
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Estado: Error de autenticación
  if (authError) {
    return (
      <Card className={`p-6 bg-red-50 border-red-200 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Authentication Failed</h3>
              <p className="text-sm text-red-600 mt-1">{authError}</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Estado: No autenticado - Mostrar botón de sign in
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <Cloud className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Connect to Google Drive</h3>
          <p className="text-sm text-gray-600">
            Sign in to upload and share your processed files securely
          </p>
        </div>

        {/* Beneficios */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">Upload files larger than 100MB</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">Automatic sharing and download links</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">Google Sheets with organized file list</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">Secure cloud storage and backup</span>
          </div>
        </div>

        {/* Detalles de permisos */}
        {showDetails && (
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-gray-600"
            >
              <Shield className="w-4 h-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Permission Details
            </Button>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <h4 className="font-medium text-gray-800 flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Required Permissions
              </h4>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-start space-x-2">
                  <FileText className="w-4 h-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong>Google Drive Files:</strong> Create folders and upload your processed ZIP fragments
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Share2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <strong>Google Sheets:</strong> Create downloadable file lists with direct links
                  </div>
                </div>
              </div>
            </div>

            {/* Política de privacidad */}
            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <h4 className="font-medium text-blue-800 mb-2">Privacy & Data Usage</h4>
              <ul className="space-y-1 text-blue-700 text-xs">
                <li>• We only access files you explicitly upload through this app</li>
                <li>• No data is stored on our servers - everything goes directly to your Drive</li>
                <li>• You can revoke permissions anytime in your Google Account settings</li>
                <li>• Files are organized in folders with timestamps for easy management</li>
              </ul>
            </div>
          </div>
        )}

        {/* Botón de autenticación */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Sign in with Google
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            By signing in, you agree to our privacy policy and terms of service
          </p>
        </div>
      </div>
    </Card>
  );
}