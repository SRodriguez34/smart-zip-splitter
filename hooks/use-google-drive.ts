/**
 * Google Drive Integration Hook
 * Maneja autenticación OAuth2, subida de archivos, creación de sheets y gestión completa de Google Drive
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppState, useAppActions } from './use-app-state';
import type { ProcessedFragment, ProcessingManifest } from '@/types/processing';

// Tipos específicos para Google Drive
export interface GoogleDriveConfig {
  clientId: string;
  scopes: string[];
  discoveryDoc: string;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  webViewLink: string;
  webContentLink: string;
  mimeType: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink: string;
}

export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number; // 0-100
  uploaded: number;
  total: number;
  speed: number; // bytes/second
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface GoogleSheetsData {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetId: number;
}

export interface DriveUploadResult {
  folder: DriveFolder;
  files: DriveFile[];
  manifest?: DriveFile;
  spreadsheet?: GoogleSheetsData;
  shareUrl: string;
}

// Hook principal
export function useGoogleDrive() {
  const { state } = useAppState();
  const { setGoogleUser, setGoogleAuthStatus, addNotification, clearGoogleAuth } = useAppActions();
  
  // Estados locales
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [totalUploadProgress, setTotalUploadProgress] = useState(0);
  const [quotaInfo, setQuotaInfo] = useState<{
    used: number;
    total: number;
    available: number;
  } | null>(null);
  
  // Configuración de Google APIs
  const config: GoogleDriveConfig = {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  };

  // Inicializar Google APIs
  const initializeGoogleApi = useCallback(async () => {
    if (isInitialized || !config.clientId) return;
    
    try {
      setIsLoading(true);
      
      // Cargar Google APIs dinámicamente
      await new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') {
          reject(new Error('Window not available'));
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google APIs'));
        document.head.appendChild(script);
      });

      // Inicializar gapi
      await new Promise<void>((resolve) => {
        (window as any).gapi.load('auth2:client', resolve);
      });

      await (window as any).gapi.client.init({
        clientId: config.clientId,
        scope: config.scopes.join(' '),
        discoveryDocs: [config.discoveryDoc]
      });

      // Verificar si ya está autenticado
      const authInstance = (window as any).gapi.auth2.getAuthInstance();
      if (authInstance.isSignedIn.get()) {
        const currentUser = authInstance.currentUser.get();
        const profile = currentUser.getBasicProfile();
        
        setGoogleUser({
          id: profile.getId(),
          name: profile.getName(),
          email: profile.getEmail(),
          picture: profile.getImageUrl()
        });
        setGoogleAuthStatus(true);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Google API:', error);
      addNotification({
        type: 'error',
        title: 'Google Drive Error',
        message: 'Failed to initialize Google Drive integration'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, config.clientId, setGoogleUser, setGoogleAuthStatus, addNotification]);

  // Inicializar al montar el componente
  useEffect(() => {
    initializeGoogleApi();
  }, [initializeGoogleApi]);

  // Autenticar con Google
  const signIn = useCallback(async () => {
    if (!isInitialized) {
      await initializeGoogleApi();
    }

    try {
      setIsLoading(true);
      const authInstance = (window as any).gapi.auth2.getAuthInstance();
      const googleUser = await authInstance.signIn();
      const profile = googleUser.getBasicProfile();
      
      setGoogleUser({
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        picture: profile.getImageUrl()
      });
      setGoogleAuthStatus(true);

      addNotification({
        type: 'success',
        title: 'Authentication Successful',
        message: `Signed in as ${profile.getName()}`
      });

      // Obtener información de cuota
      await checkQuota();
      
    } catch (error) {
      console.error('Sign in error:', error);
      addNotification({
        type: 'error',
        title: 'Authentication Failed',
        message: 'Failed to sign in to Google Drive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, initializeGoogleApi, setGoogleUser, setGoogleAuthStatus, addNotification]);

  // Cerrar sesión
  const signOut = useCallback(async () => {
    try {
      const authInstance = (window as any).gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      clearGoogleAuth();
      setQuotaInfo(null);
      
      addNotification({
        type: 'info',
        title: 'Signed Out',
        message: 'Successfully signed out of Google Drive'
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [clearGoogleAuth, addNotification]);

  // Verificar cuota disponible
  const checkQuota = useCallback(async () => {
    if (!state.isGoogleAuthenticated) return null;
    
    try {
      const response = await (window as any).gapi.client.drive.about.get({
        fields: 'storageQuota'
      });
      
      const quota = response.result.storageQuota;
      const quotaData = {
        used: parseInt(quota.usage || '0'),
        total: parseInt(quota.limit || '0'),
        available: parseInt(quota.limit || '0') - parseInt(quota.usage || '0')
      };
      
      setQuotaInfo(quotaData);
      return quotaData;
    } catch (error) {
      console.error('Error checking quota:', error);
      return null;
    }
  }, [state.isGoogleAuthenticated]);

  // Crear carpeta en Drive
  const createFolder = useCallback(async (name: string): Promise<DriveFolder> => {
    const response = await (window as any).gapi.client.drive.files.create({
      resource: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      },
      fields: 'id,name,webViewLink'
    });
    
    return {
      id: response.result.id,
      name: response.result.name,
      webViewLink: response.result.webViewLink
    };
  }, []);

  // Subir archivo individual
  const uploadFile = useCallback(async (
    file: Blob,
    fileName: string,
    folderId: string,
    onProgress?: (progress: number) => void
  ): Promise<DriveFile> => {
    return new Promise((resolve, reject) => {
      const metadata = {
        name: fileName,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
      form.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          resolve({
            id: result.id,
            name: result.name,
            size: file.size,
            webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
            webContentLink: `https://drive.google.com/uc?id=${result.id}&export=download`,
            mimeType: file.type
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      const accessToken = (window as any).gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
      
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name');
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(form);
    });
  }, []);

  // Subir fragmentos con progreso
  const uploadFragments = useCallback(async (
    fragments: ProcessedFragment[],
    manifest?: ProcessingManifest
  ): Promise<DriveUploadResult> => {
    if (!state.isGoogleAuthenticated) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // Crear carpeta con timestamp
      const folderName = `SmartZipSplitter_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const folder = await createFolder(folderName);

      // Inicializar progreso
      const initialProgress: UploadProgress[] = fragments.map((fragment, index) => ({
        fileIndex: index,
        fileName: fragment.name,
        progress: 0,
        uploaded: 0,
        total: fragment.size,
        speed: 0,
        status: 'pending'
      }));
      setUploadProgress(initialProgress);

      const uploadedFiles: DriveFile[] = [];
      let completedFiles = 0;

      // Subir cada fragmento
      for (let i = 0; i < fragments.length; i++) {
        const fragment = fragments[i];
        if (!fragment.blob) continue;

        // Actualizar estado a "uploading"
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'uploading' as const } : p
        ));

        const startTime = Date.now();
        let lastLoaded = 0;

        try {
          const file = await uploadFile(
            fragment.blob,
            fragment.name,
            folder.id,
            (progress) => {
              const now = Date.now();
              const elapsed = (now - startTime) / 1000;
              const loaded = (fragment.size * progress) / 100;
              const speed = elapsed > 0 ? (loaded - lastLoaded) / elapsed : 0;
              lastLoaded = loaded;

              setUploadProgress(prev => prev.map((p, idx) => 
                idx === i ? {
                  ...p,
                  progress,
                  uploaded: loaded,
                  speed
                } : p
              ));
            }
          );

          uploadedFiles.push(file);
          completedFiles++;

          // Actualizar estado a "completed"
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'completed' as const, progress: 100 } : p
          ));

          // Actualizar progreso total
          setTotalUploadProgress((completedFiles / fragments.length) * 100);

        } catch (error) {
          console.error(`Error uploading ${fragment.name}:`, error);
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { 
              ...p, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            } : p
          ));
        }
      }

      // Subir manifest si existe
      let manifestFile: DriveFile | undefined;
      if (manifest) {
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
          type: 'application/json'
        });
        manifestFile = await uploadFile(manifestBlob, 'manifest.json', folder.id);
      }

      // Crear Google Sheet con enlaces
      const spreadsheet = await createSharingSheet(folder, uploadedFiles, manifestFile);

      // Hacer la carpeta pública
      await makePublic(folder.id);
      
      const result: DriveUploadResult = {
        folder,
        files: uploadedFiles,
        manifest: manifestFile,
        spreadsheet,
        shareUrl: folder.webViewLink
      };

      addNotification({
        type: 'success',
        title: 'Upload Complete',
        message: `Successfully uploaded ${uploadedFiles.length} files to Google Drive`
      });

      return result;

    } catch (error) {
      console.error('Error uploading to Drive:', error);
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload files to Google Drive'
      });
      throw error;
    }
  }, [state.isGoogleAuthenticated, createFolder, uploadFile, addNotification]);

  // Crear Google Sheet con enlaces de descarga
  const createSharingSheet = useCallback(async (
    folder: DriveFolder,
    files: DriveFile[],
    manifest?: DriveFile
  ): Promise<GoogleSheetsData> => {
    const spreadsheet = await (window as any).gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: `${folder.name} - Download Links`
        }
      }
    });

    const spreadsheetId = spreadsheet.result.spreadsheetId;

    // Preparar datos para la hoja
    const headers = ['File Name', 'Size (MB)', 'Download Link', 'View Link'];
    const rows = files.map(file => [
      file.name,
      (file.size / (1024 * 1024)).toFixed(2),
      file.webContentLink,
      file.webViewLink
    ]);

    if (manifest) {
      rows.unshift([
        manifest.name,
        (manifest.size / (1024 * 1024)).toFixed(2),
        manifest.webContentLink,
        manifest.webViewLink
      ]);
    }

    // Insertar datos en la hoja
    await (window as any).gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:D' + (rows.length + 1),
      valueInputOption: 'RAW',
      resource: {
        values: [headers, ...rows]
      }
    });

    // Hacer la hoja pública
    await makePublic(spreadsheetId);

    // Mover la hoja a la carpeta
    await (window as any).gapi.client.drive.files.update({
      fileId: spreadsheetId,
      addParents: folder.id,
      removeParents: 'root'
    });

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      sheetId: 0
    };
  }, []);

  // Hacer público un archivo o carpeta
  const makePublic = useCallback(async (fileId: string) => {
    try {
      await (window as any).gapi.client.drive.permissions.create({
        fileId,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });
    } catch (error) {
      console.warn('Could not make file public:', error);
    }
  }, []);

  // Estado del hook
  const isSignedIn = state.isGoogleAuthenticated;
  const currentUser = state.googleUser;

  return {
    // Estado
    isInitialized,
    isLoading,
    isSignedIn,
    currentUser,
    uploadProgress,
    totalUploadProgress,
    quotaInfo,

    // Métodos de autenticación
    signIn,
    signOut,
    
    // Métodos de Drive
    uploadFragments,
    createSharingSheet,
    checkQuota,
    
    // Utilidades
    initializeGoogleApi
  };
}