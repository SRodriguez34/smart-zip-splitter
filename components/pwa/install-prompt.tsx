/**
 * PWA Install Prompt Component
 * Provides a custom install experience with better UX than browser default
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Zap,
  Shield,
  Wifi,
  Star
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  className?: string;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function InstallPrompt({ className = "", onInstall, onDismiss }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  // Check if app is already installed
  useEffect(() => {
    const checkIfInstalled = () => {
      // Check for standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check for iOS standalone
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    // Detect device type
    const detectDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setDeviceType(isMobile ? 'mobile' : 'desktop');
    };

    checkIfInstalled();
    detectDevice();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
      
      // Show prompt after a delay if user hasn't dismissed it
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const lastShown = localStorage.getItem('pwa-install-last-shown');
        const now = Date.now();
        
        // Don't show if dismissed recently (within 7 days)
        if (dismissed && now - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
          return;
        }
        
        // Don't show if shown recently (within 1 day)
        if (lastShown && now - parseInt(lastShown) < 24 * 60 * 60 * 1000) {
          return;
        }
        
        setShowPrompt(true);
        localStorage.setItem('pwa-install-last-shown', now.toString());
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] Install accepted');
        onInstall?.();
      } else {
        console.log('[PWA] Install dismissed');
      }
    } catch (error) {
      console.error('[PWA] Install error:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismiss?.();
  };

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}
        >
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
            <div className="p-6 relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="absolute top-2 right-2 h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Icon */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-white/20 rounded-full">
                  {deviceType === 'mobile' ? (
                    <Smartphone className="h-6 w-6" />
                  ) : (
                    <Monitor className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Install App</h3>
                  <p className="text-sm text-white/90">
                    Get the full experience
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-300" />
                  <span>Lightning fast access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wifi className="h-4 w-4 text-green-300" />
                  <span>Works offline</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-300" />
                  <span>Secure & private</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-purple-300" />
                  <span>No app store needed</span>
                </div>
              </div>

              {/* Install button */}
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold"
              >
                {isInstalling ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                    <span>Installing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Install Smart ZIP Splitter</span>
                  </div>
                )}
              </Button>

              {/* Platform-specific instructions */}
              <div className="mt-3 text-xs text-white/70 text-center">
                {deviceType === 'mobile' && (
                  <p>
                    Or tap <strong>Add to Home Screen</strong> in your browser menu
                  </p>
                )}
                {deviceType === 'desktop' && (
                  <p>
                    You can also install from the address bar or browser menu
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to programmatically show install prompt
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  };

  return {
    canInstall,
    promptInstall
  };
}