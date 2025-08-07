/**
 * Web Vitals API Endpoint
 * Collects Core Web Vitals and performance metrics for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

interface WebVital {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
  attribution?: {
    [key: string]: any;
  };
}

interface PerformanceData {
  url: string;
  userAgent: string;
  timestamp: number;
  vitals: WebVital[];
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  sessionId: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as PerformanceData;

    // Validate required fields
    if (!data.vitals || !Array.isArray(data.vitals)) {
      return NextResponse.json(
        { error: 'Invalid vitals data' },
        { status: 400 }
      );
    }

    // Extract useful information
    const performanceEntry = {
      ...data,
      ip: request.ip || 'unknown',
      country: request.geo?.country || 'unknown',
      region: request.geo?.region || 'unknown',
      timestamp: Date.now(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        url: performanceEntry.url,
        vitals: performanceEntry.vitals.map(v => ({
          name: v.name,
          value: v.value,
          rating: v.rating
        }))
      });
    }

    // In production, you would send this to your analytics service
    // Examples:
    // - Google Analytics 4
    // - PostHog
    // - DataDog
    // - Custom analytics endpoint

    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Google Analytics 4
      if (process.env.NEXT_PUBLIC_GA_TRACKING_ID) {
        await sendToGoogleAnalytics(performanceEntry);
      }

      // Example: Send to PostHog
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        await sendToPostHog(performanceEntry);
      }

      // Example: Send to custom endpoint
      if (process.env.ANALYTICS_WEBHOOK_URL) {
        await sendToWebhook(performanceEntry);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Web Vitals] Error processing data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to send data to Google Analytics 4
async function sendToGoogleAnalytics(data: PerformanceData & { ip: string; country: string; region: string; }) {
  try {
    const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
    const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;
    const GA_API_SECRET = process.env.GA_API_SECRET;

    if (!GA_MEASUREMENT_ID || !GA_API_SECRET) return;

    const events = data.vitals.map(vital => ({
      name: 'web_vital',
      params: {
        metric_name: vital.name,
        metric_value: vital.value,
        metric_rating: vital.rating,
        page_location: data.url,
        user_agent: data.userAgent,
        connection_type: data.connectionType,
        device_memory: data.deviceMemory,
        hardware_concurrency: data.hardwareConcurrency,
      }
    }));

    const payload = {
      client_id: data.sessionId,
      user_id: data.userId,
      events
    };

    await fetch(`${GA_ENDPOINT}?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Error sending to Google Analytics:', error);
  }
}

// Helper function to send data to PostHog
async function sendToPostHog(data: PerformanceData & { ip: string; country: string; region: string; }) {
  try {
    const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
    const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!POSTHOG_KEY) return;

    const events = data.vitals.map(vital => ({
      event: 'web_vital',
      distinct_id: data.sessionId,
      properties: {
        metric_name: vital.name,
        metric_value: vital.value,
        metric_rating: vital.rating,
        url: data.url,
        user_agent: data.userAgent,
        connection_type: data.connectionType,
        device_memory: data.deviceMemory,
        hardware_concurrency: data.hardwareConcurrency,
        country: data.country,
        region: data.region,
        timestamp: data.timestamp
      }
    }));

    for (const event of events) {
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          ...event
        })
      });
    }
  } catch (error) {
    console.error('Error sending to PostHog:', error);
  }
}

// Helper function to send data to custom webhook
async function sendToWebhook(data: PerformanceData & { ip: string; country: string; region: string; }) {
  try {
    const webhookUrl = process.env.ANALYTICS_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANALYTICS_WEBHOOK_SECRET || ''}`
      },
      body: JSON.stringify({
        type: 'web_vitals',
        data
      })
    });
  } catch (error) {
    console.error('Error sending to webhook:', error);
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'web-vitals',
    timestamp: Date.now()
  });
}