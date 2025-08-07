# Google Drive Integration Setup

This guide will help you set up Google Drive integration for the Smart ZIP Splitter application.

## Overview

Google Drive integration enables:
- Processing files larger than 100MB
- Automatic cloud storage of split files
- Shareable links for easy distribution
- Google Sheets with download links
- QR codes for mobile access

## Prerequisites

- Google account
- Google Cloud Console access
- Your application's domain/URL

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `smart-zip-splitter` (or your preferred name)
4. Click "Create"

### 2. Enable Required APIs

1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for and enable the following APIs:
   - **Google Drive API**
   - **Google Sheets API**

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in application name: "Smart ZIP Splitter"
   - Add your email as developer contact
   - Skip optional fields and save
4. For the OAuth client ID:
   - Application type: "Web application"
   - Name: "Smart ZIP Splitter Web Client"
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`

### 4. Configure Environment Variables

1. Copy the Client ID from the credentials page
2. Create `.env.local` file in your project root:

```bash
# Copy from .env.example and update
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id.googleusercontent.com
NEXTAUTH_URL=http://localhost:3000
```

### 5. OAuth Consent Screen Configuration

For production deployment, you'll need to configure the OAuth consent screen:

1. Go to "APIs & Services" → "OAuth consent screen"
2. Add the following scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `openid`
   - `profile`
   - `email`
3. Add authorized domains (your production domain)
4. Submit for verification (required for production use)

## Testing the Integration

### Development Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Upload a file larger than 100MB
3. You should see the Google authentication prompt
4. After signing in, the file should be processed and uploaded to Google Drive

### Verify Setup

Check that the following work:
- ✅ Google sign-in flow completes successfully
- ✅ Files are uploaded to Google Drive in organized folders
- ✅ Google Sheets are created with download links
- ✅ Sharing URLs are generated and accessible
- ✅ QR codes work on mobile devices

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure redirect URIs in Google Console match your app's callback URL exactly
   - Check for trailing slashes and HTTP vs HTTPS

2. **"invalid_client" error**
   - Verify the Client ID is correct in your environment variables
   - Make sure you're using the Client ID, not the Client Secret

3. **Scope permission errors**
   - Ensure Google Drive API and Google Sheets API are enabled
   - Check that the OAuth consent screen has the correct scopes

4. **Files not appearing in Drive**
   - Check the Google account's Drive storage quota
   - Verify API quotas haven't been exceeded

### Debug Mode

Enable debug logging by adding to your environment:

```bash
NEXT_PUBLIC_DEBUG_GOOGLE_API=true
```

This will log API calls and responses to the browser console.

## Security Considerations

### API Key Security

- Never commit real API keys to version control
- Use environment variables for all sensitive configuration
- Consider using Google Cloud Secret Manager for production

### Scope Minimization

The app uses minimal required scopes:
- `drive.file`: Access only to files created by the app
- `spreadsheets`: Create and manage sheets for download links

### User Data

- Files are stored in the user's own Google Drive
- No data is stored on our servers
- Users can revoke access anytime from their Google Account settings

## Production Deployment

### Vercel Deployment

1. Add environment variables in Vercel dashboard
2. Update `NEXTAUTH_URL` to your production domain
3. Add production redirect URI to Google Console

### Other Platforms

Ensure the following for any deployment platform:
- Environment variables are properly set
- OAuth redirect URIs include your production domain
- HTTPS is enabled (required by Google OAuth)

## API Limits and Quotas

Google Drive API has the following limits:
- 1,000 requests per 100 seconds per user
- 10,000 requests per 100 seconds

For high-volume usage, consider:
- Implementing exponential backoff
- Batching API requests
- Requesting quota increases from Google

## Support

For issues with this setup:
1. Check the troubleshooting section above
2. Verify all steps were completed correctly
3. Check the browser console for error messages
4. Review Google Cloud Console logs

For Google API specific issues, refer to:
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)