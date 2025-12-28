
'use client';

import React from 'react';
import { UserProvider } from '../context/UserContext';
import { LocaleProvider } from '../context/LocaleContext';

/**
 * Providers component that wraps the application with necessary context providers.
 * Uses React.PropsWithChildren to ensure JSX children are correctly typed and recognized.
 */
export function Providers({ children }: React.PropsWithChildren<{}>) {
  return (
    <UserProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </UserProvider>
  );
}
