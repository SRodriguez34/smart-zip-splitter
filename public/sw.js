/**
 * Smart ZIP Splitter - Service Worker
 * Production-ready PWA service worker with comprehensive caching, background sync, and notifications
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_PREFIX = 'smart-zip-splitter';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${CACHE_VERSION}`;
const IMAGES_CACHE = `${CACHE_PREFIX}-images-${CACHE_VERSION}`;

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Network-first resources (API calls, external resources)
const NETWORK_FIRST_PATTERNS = [
  /^https:\/\/apis\.google\.com/,
  /^https:\/\/accounts\.google\.com/,
  /^https:\/\/www\.googleapis\.com/,
  /\/api\//
];

// Cache-first resources (static assets, images)
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
  /\.(?:css|js)$/,
  /\/icons\//,
  /\/fonts\//
];

// Maximum cache sizes
const MAX_ENTRIES = {
  dynamic: 50,
  images: 30
};

// Background sync tags
const SYNC_TAGS = {
  GOOGLE_DRIVE_UPLOAD: 'google-drive-upload',
  ANALYTICS: 'analytics',
  ERROR_REPORT: 'error-report'
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker:', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(STATIC_ASSETS);
        
        // Cache dynamic resources cache
        await caches.open(DYNAMIC_CACHE);
        await caches.open(IMAGES_CACHE);
        
        console.log('[SW] Installation complete');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker:', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION)
        );
        
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        // Claim all clients
        await self.clients.claim();
        
        console.log('[SW] Activation complete');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event Handler with Advanced Caching Strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests except for known APIs
  if (url.origin !== location.origin && !isAllowedCrossOrigin(url)) {
    return;
  }
  
  event.respondWith(handleFetchRequest(request));
});

/**
 * Handle fetch requests with appropriate caching strategy
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for APIs and dynamic content
    if (isNetworkFirst(url)) {
      return await networkFirstStrategy(request);
    }
    
    // Cache-first strategy for static assets
    if (isCacheFirst(url)) {
      return await cacheFirstStrategy(request);
    }
    
    // Stale-while-revalidate for HTML pages
    if (isHTMLRequest(request)) {
      return await staleWhileRevalidateStrategy(request);
    }
    
    // Default to network-first
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return await getFallbackResponse(request);
  }
}

/**
 * Network-first caching strategy
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      await cleanupCache(DYNAMIC_CACHE, MAX_ENTRIES.dynamic);
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Cache-first strategy for static assets
 */
async function cacheFirstStrategy(request) {
  const url = new URL(request.url);
  const cacheName = url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|avif)$/) 
    ? IMAGES_CACHE 
    : STATIC_CACHE;
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
    
    if (cacheName === IMAGES_CACHE) {
      await cleanupCache(IMAGES_CACHE, MAX_ENTRIES.images);
    }
  }
  
  return networkResponse;
}

/**
 * Stale-while-revalidate strategy for HTML
 */
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Fetch in background and update cache
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => {
    // Ignore network errors in background
  });
  
  return cachedResponse || fetchPromise;
}

/**
 * Background Sync for Google Drive Uploads
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.GOOGLE_DRIVE_UPLOAD:
      event.waitUntil(handleGoogleDriveSync());
      break;
    case SYNC_TAGS.ANALYTICS:
      event.waitUntil(handleAnalyticsSync());
      break;
    case SYNC_TAGS.ERROR_REPORT:
      event.waitUntil(handleErrorReportSync());
      break;
  }
});

/**
 * Handle Google Drive upload sync
 */
async function handleGoogleDriveSync() {
  try {
    console.log('[SW] Processing Google Drive background sync');
    
    // Get pending uploads from IndexedDB
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        await retryGoogleDriveUpload(upload);
        await removePendingUpload(upload.id);
        
        // Show success notification
        await showNotification('Upload Complete', {
          body: `${upload.fileName} has been uploaded to Google Drive`,
          icon: '/icons/icon-192.png',
          tag: 'upload-success',
          actions: [
            { action: 'view', title: 'View Files' }
          ]
        });
        
      } catch (error) {
        console.error('[SW] Failed to retry upload:', error);
        
        // Show error notification
        await showNotification('Upload Failed', {
          body: `Failed to upload ${upload.fileName}. Will retry later.`,
          icon: '/icons/icon-192.png',
          tag: 'upload-error'
        });
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Handle analytics sync
 */
async function handleAnalyticsSync() {
  try {
    const pendingEvents = await getPendingAnalytics();
    
    for (const event of pendingEvents) {
      try {
        await sendAnalyticsEvent(event);
        await removePendingAnalytics(event.id);
      } catch (error) {
        console.error('[SW] Failed to send analytics:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

/**
 * Handle error report sync
 */
async function handleErrorReportSync() {
  try {
    const pendingErrors = await getPendingErrorReports();
    
    for (const errorReport of pendingErrors) {
      try {
        await sendErrorReport(errorReport);
        await removePendingErrorReport(errorReport.id);
      } catch (error) {
        console.error('[SW] Failed to send error report:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Error report sync failed:', error);
  }
}

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    event.waitUntil(
      showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: data.tag,
        data: data.data,
        actions: data.actions || []
      })
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { action, data } = event;
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      
      // Handle notification actions
      switch (action) {
        case 'view':
          if (data?.url) {
            if (clients.length > 0) {
              clients[0].navigate(data.url);
              clients[0].focus();
            } else {
              self.clients.openWindow(data.url);
            }
          }
          break;
        default:
          // Default action - focus or open app
          if (clients.length > 0) {
            clients[0].focus();
          } else {
            self.clients.openWindow('/');
          }
          break;
      }
    })()
  );
});

/**
 * Message Handler for communication with main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_UPLOAD_FOR_SYNC':
      cacheUploadForSync(payload);
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0]?.postMessage({ type: 'CACHE_STATUS', payload: status });
      });
      break;
  }
});

/**
 * Utility Functions
 */

function isNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.href));
}

function isCacheFirst(url) {
  return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.href));
}

function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

function isAllowedCrossOrigin(url) {
  const allowedOrigins = [
    'https://apis.google.com',
    'https://accounts.google.com',
    'https://www.googleapis.com'
  ];
  return allowedOrigins.some(origin => url.href.startsWith(origin));
}

async function getFallbackResponse(request) {
  if (isHTMLRequest(request)) {
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/offline.html') || new Response('Offline', { status: 503 });
  }
  
  return new Response('Network Error', { status: 503 });
}

async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

async function showNotification(title, options) {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    return self.registration.showNotification(title, options);
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }
  
  return status;
}

/**
 * IndexedDB Utilities for Background Sync
 */

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('smart-zip-splitter-sync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('uploads')) {
        db.createObjectStore('uploads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('analytics')) {
        db.createObjectStore('analytics', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('errors')) {
        db.createObjectStore('errors', { keyPath: 'id' });
      }
    };
  });
}

async function getPendingUploads() {
  const db = await openDB();
  const transaction = db.transaction(['uploads'], 'readonly');
  const store = transaction.objectStore('uploads');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function cacheUploadForSync(uploadData) {
  const db = await openDB();
  const transaction = db.transaction(['uploads'], 'readwrite');
  const store = transaction.objectStore('uploads');
  
  const upload = {
    id: Date.now() + Math.random(),
    ...uploadData,
    timestamp: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(upload);
    request.onsuccess = () => resolve(upload.id);
    request.onerror = () => reject(request.error);
  });
}

async function removePendingUpload(id) {
  const db = await openDB();
  const transaction = db.transaction(['uploads'], 'readwrite');
  const store = transaction.objectStore('uploads');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Similar functions for analytics and error reports would be implemented here
async function getPendingAnalytics() { return []; }
async function removePendingAnalytics(id) { }
async function getPendingErrorReports() { return []; }
async function removePendingErrorReport(id) { }

// Retry Google Drive upload
async function retryGoogleDriveUpload(upload) {
  try {
    // Reconstruct the blob from base64
    const binaryString = atob(upload.fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: upload.mimeType });

    // Prepare form data
    const metadata = {
      name: upload.fileName,
      parents: [upload.folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', blob);

    // Make the upload request
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upload.accessToken}`
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[SW] Successfully uploaded:', result.name);
    
    return {
      id: result.id,
      name: result.name,
      size: upload.size,
      webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
      webContentLink: `https://drive.google.com/uc?id=${result.id}&export=download`,
      mimeType: upload.mimeType
    };
  } catch (error) {
    console.error('[SW] Upload retry failed:', error);
    throw error;
  }
}

async function sendAnalyticsEvent(event) {
  // Implementation would send analytics data
}

async function sendErrorReport(errorReport) {
  // Implementation would send error report to monitoring service
}

console.log('[SW] Service Worker loaded successfully:', CACHE_VERSION);