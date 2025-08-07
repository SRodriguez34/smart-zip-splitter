/**
 * Share Results Component
 * Componente completo para compartir resultados con múltiples opciones y QR codes
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';
import {
  Share2,
  Link,
  QrCode,
  Download,
  ExternalLink,
  Copy,
  CheckCircle,
  FileSpreadsheet,
  Folder,
  Mail,
  MessageCircle,
  Smartphone,
  Monitor,
  Eye,
  AlertCircle
} from 'lucide-react';

interface ShareResultsProps {
  onCopySuccess?: (text: string) => void;
  showQRCodes?: boolean;
  showSocialShare?: boolean;
  className?: string;
}

export function ShareResults({
  onCopySuccess,
  showQRCodes = true,
  showSocialShare = true,
  className = ""
}: ShareResultsProps) {
  const { state } = useAppState();
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [qrCodes, setQRCodes] = useState<Record<string, string>>({});
  const [showInstructions, setShowInstructions] = useState(false);

  const { googleDriveData, fragments } = state;

  // Generar QR codes dinámicamente
  useEffect(() => {
    if (!showQRCodes || !googleDriveData) return;

    const generateQRCode = async (text: string, key: string) => {
      try {
        // Usar una librería de QR code simple (en un proyecto real usarías qrcode)
        const qrData = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
        setQRCodes(prev => ({ ...prev, [key]: qrData }));
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    if (googleDriveData.shareUrl) {
      generateQRCode(googleDriveData.shareUrl, 'folder');
    }
  }, [googleDriveData, showQRCodes]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, label]));
      onCopySuccess?.(text);
      
      // Limpiar el estado después de 2 segundos
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(label);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const openWhatsApp = (text: string) => {
    const message = encodeURIComponent(`Smart ZIP Splitter Results:\n\n${text}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const openEmail = (text: string) => {
    const subject = encodeURIComponent('Smart ZIP Splitter - Your Files');
    const body = encodeURIComponent(`Here are your processed files:\n\n${text}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const generateShareText = () => {
    if (!googleDriveData) return '';
    
    let text = 'Your ZIP file has been processed and uploaded to Google Drive!\n\n';
    
    if (googleDriveData.folderUrl) {
      text += `📁 Access all files: ${googleDriveData.folderUrl}\n`;
    }
    
    if (googleDriveData.fileLinks && googleDriveData.fileLinks.length > 0) {
      text += `\n📄 Individual files (${googleDriveData.fileLinks.length}):\n`;
      googleDriveData.fileLinks.forEach((file, index) => {
        text += `${index + 1}. ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)\n`;
      });
    }
    
    if (googleDriveData.manifestUrl) {
      text += `\n📋 Download instructions: ${googleDriveData.manifestUrl}\n`;
    }
    
    text += '\nProcessed with Smart ZIP Splitter 🚀';
    return text;
  };

  if (!googleDriveData || !fragments) {
    return null;
  }

  const shareText = generateShareText();

  return (
    <Card className={`p-6 bg-gradient-to-br from-green-50 to-blue-50 border-green-200 ${className}`}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Files Ready to Share!</h3>
          <p className="text-gray-600">
            Your files have been uploaded to Google Drive and are ready for sharing
          </p>
        </div>

        {/* Enlaces principales */}
        <div className="space-y-4">
          {/* Enlace a la carpeta principal */}
          {googleDriveData.folderUrl && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Folder className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Main Folder</h4>
                    <p className="text-sm text-gray-600">Access all {fragments.length} files</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(googleDriveData.folderUrl!, 'folder')}
                    className={copiedItems.has('folder') ? 'bg-green-100 text-green-700' : ''}
                  >
                    {copiedItems.has('folder') ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(googleDriveData.folderUrl, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Google Sheets con enlaces */}
          {googleDriveData.manifestUrl && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Download Sheet</h4>
                    <p className="text-sm text-gray-600">Google Sheets with direct download links</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(googleDriveData.manifestUrl!, 'sheet')}
                    className={copiedItems.has('sheet') ? 'bg-green-100 text-green-700' : ''}
                  >
                    {copiedItems.has('sheet') ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(googleDriveData.manifestUrl, '_blank')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Opciones de compartir */}
        {showSocialShare && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Share2 className="w-4 h-4 mr-2" />
              Share with Others
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => openWhatsApp(shareText)}
                className="flex items-center justify-center space-x-2 h-12"
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span>WhatsApp</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => openEmail(shareText)}
                className="flex items-center justify-center space-x-2 h-12"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <span>Email</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => copyToClipboard(shareText, 'shareText')}
                className={`flex items-center justify-center space-x-2 h-12 col-span-2 ${
                  copiedItems.has('shareText') ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                {copiedItems.has('shareText') ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Link className="w-5 h-5" />
                )}
                <span>
                  {copiedItems.has('shareText') ? 'Copied!' : 'Copy Share Text'}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* QR Codes */}
        {showQRCodes && qrCodes.folder && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <QrCode className="w-4 h-4 mr-2" />
              QR Codes for Mobile Access
            </h4>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Scan to Access Files</h5>
                  <div className="inline-block p-2 bg-gray-50 rounded-lg">
                    <img 
                      src={qrCodes.folder} 
                      alt="QR Code for folder access"
                      className="w-32 h-32"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Point your phone camera at this QR code to open the folder
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instrucciones de descarga */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            {showInstructions ? 'Hide' : 'Show'} Download Instructions
          </Button>

          {showInstructions && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-4 text-sm">
              <h4 className="font-medium text-blue-800 flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                For Computer Users
              </h4>
              <ol className="space-y-2 text-blue-700 pl-4">
                <li>1. Click "Open" on the Main Folder link above</li>
                <li>2. Select all files (Ctrl+A or Cmd+A)</li>
                <li>3. Right-click and choose "Download"</li>
                <li>4. Files will be downloaded as a ZIP</li>
              </ol>

              <h4 className="font-medium text-blue-800 flex items-center mt-4">
                <Smartphone className="w-4 h-4 mr-2" />
                For Mobile Users
              </h4>
              <ol className="space-y-2 text-blue-700 pl-4">
                <li>1. Scan the QR code or tap the folder link</li>
                <li>2. Open the Google Drive app when prompted</li>
                <li>3. Tap each file individually to download</li>
                <li>4. Or use "Add to My Drive" to save for later</li>
              </ol>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-yellow-800 text-xs">
                    <strong>Note:</strong> Files are stored in your Google Drive and will count against your storage quota. 
                    You can move or delete them anytime from your Drive.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium">Files are ready and accessible</span>
          </div>
          <ul className="space-y-1 text-xs pl-6">
            <li>• Links are public and don't require Google account to access</li>
            <li>• Files are organized in a timestamped folder</li>
            <li>• Google Sheets provides direct download links for each file</li>
            <li>• QR codes work with any smartphone camera app</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}