/**
 * Google OAuth API Route
 * Provides OAuth configuration and utilities for Google Drive integration
 */

import { NextRequest, NextResponse } from 'next/server';

// OAuth configuration
const getOAuthConfig = () => ({
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`,
  scope: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
    'openid',
    'profile',
    'email'
  ].join(' '),
  responseType: 'code',
  accessType: 'offline',
  prompt: 'consent'
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'config':
      // Return OAuth configuration for client-side use
      const config = getOAuthConfig();
      
      if (!config.clientId) {
        return NextResponse.json(
          { error: 'Google Client ID not configured' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        clientId: config.clientId,
        scope: config.scope,
        redirectUri: config.redirectUri
      });

    case 'authorize':
      // Generate authorization URL and redirect
      const authConfig = getOAuthConfig();
      
      if (!authConfig.clientId) {
        return NextResponse.json(
          { error: 'Google Client ID not configured' },
          { status: 500 }
        );
      }

      const state = crypto.randomUUID();
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      
      authUrl.searchParams.append('client_id', authConfig.clientId);
      authUrl.searchParams.append('redirect_uri', authConfig.redirectUri);
      authUrl.searchParams.append('scope', authConfig.scope);
      authUrl.searchParams.append('response_type', authConfig.responseType);
      authUrl.searchParams.append('access_type', authConfig.accessType);
      authUrl.searchParams.append('prompt', authConfig.prompt);
      authUrl.searchParams.append('state', state);

      return NextResponse.redirect(authUrl.toString());

    default:
      return NextResponse.json(
        { error: 'Invalid action parameter' },
        { status: 400 }
      );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'validate':
        // Validate OAuth configuration
        const config = getOAuthConfig();
        
        return NextResponse.json({
          valid: !!config.clientId,
          clientId: config.clientId ? `${config.clientId.slice(0, 20)}...` : null,
          scopes: config.scope.split(' ')
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}