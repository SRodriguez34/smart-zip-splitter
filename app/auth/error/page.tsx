/**
 * OAuth Error Page
 * Displays authentication errors and provides retry options
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [errorDescription, setErrorDescription] = useState<string>('');

  useEffect(() => {
    setError(searchParams.get('error') || 'unknown_error');
    setErrorDescription(
      searchParams.get('error_description') || 'An unknown error occurred during authentication'
    );
  }, [searchParams]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'access_denied':
        return 'You denied access to your Google account. Google Drive integration requires permission to upload and manage files.';
      case 'invalid_request':
        return 'There was an issue with the authentication request. Please try again.';
      case 'unsupported_response_type':
        return 'Authentication configuration error. Please contact support.';
      case 'invalid_scope':
        return 'Invalid permissions requested. Please contact support.';
      case 'server_error':
        return 'Google authentication server encountered an error. Please try again later.';
      case 'temporarily_unavailable':
        return 'Google authentication is temporarily unavailable. Please try again in a few minutes.';
      case 'missing_code':
        return 'Authentication process was interrupted. Please try signing in again.';
      case 'callback_error':
        return 'There was an error processing your authentication. Please try again.';
      default:
        return 'An unexpected error occurred during authentication.';
    }
  };

  const getErrorSolution = (errorCode: string): string => {
    switch (errorCode) {
      case 'access_denied':
        return 'To use Google Drive integration, please grant the necessary permissions when signing in.';
      case 'server_error':
      case 'temporarily_unavailable':
        return 'This is usually temporary. Wait a few minutes and try again.';
      case 'invalid_request':
      case 'missing_code':
      case 'callback_error':
        return 'Try clearing your browser cache and cookies, then attempt to sign in again.';
      default:
        return 'Please try signing in again, or contact support if the problem persists.';
    }
  };

  const handleRetry = () => {
    // Redirect back to the main app
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="text-center space-y-6">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Error Title */}
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h1>
            <p className="text-sm text-gray-600">
              Unable to connect to your Google account
            </p>
          </div>

          {/* Error Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-red-800 mb-2">What happened?</h3>
            <p className="text-sm text-red-700 mb-3">
              {getErrorMessage(error)}
            </p>
            
            <h3 className="font-medium text-red-800 mb-2">How to fix it:</h3>
            <p className="text-sm text-red-700">
              {getErrorSolution(error)}
            </p>
          </div>

          {/* Technical Details (collapsible) */}
          <details className="text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono">
              <div><strong>Error Code:</strong> {error}</div>
              {errorDescription && (
                <div className="mt-1"><strong>Description:</strong> {errorDescription}</div>
              )}
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500">
            <p>
              Need help? Make sure you're using a supported browser and have
              cookies enabled. If problems persist, try using an incognito/private
              browsing window.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}