'use client';

import { useEffect, useState } from 'react';
import { InstallPrompt } from './pwa/install-prompt';
import { UpdateNotification } from './pwa/update-notification';
import { OfflineIndicator } from './pwa/offline-indicator';

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <InstallPrompt />
      <UpdateNotification />
      <OfflineIndicator />
    </>
  );
}