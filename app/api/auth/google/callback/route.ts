/**
 * Google OAuth Callback API Route
 * Handles OAuth2 callback and token exchange for Google Drive integration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Handle OAuth errors
  if (error) {
    const errorParams = new URLSearchParams({
      error: error,
      error_description: searchParams.get('error_description') || 'OAuth error occurred'
    });
    
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    const errorParams = new URLSearchParams({
      error: 'missing_code',
      error_description: 'Authorization code is missing'
    });
    
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url)
    );
  }

  try {
    // In a client-side OAuth flow, we don't need to exchange the code server-side
    // The Google APIs client library handles the token exchange in the browser
    // This endpoint is mainly for handling errors and redirecting back to the app
    
    // Redirect back to the main app with success parameters
    const successParams = new URLSearchParams({
      status: 'success',
      message: 'Authentication completed successfully'
    });
    
    return NextResponse.redirect(
      new URL(`/?${successParams.toString()}`, request.url)
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    const errorParams = new URLSearchParams({
      error: 'callback_error',
      error_description: 'Failed to process OAuth callback'
    });
    
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url)
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}