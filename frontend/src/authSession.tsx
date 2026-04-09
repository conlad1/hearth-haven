import { createContext, useContext } from 'react';
import type { CurrentUser } from './api/AuthService';

export type AuthSessionState = {
  isAuthenticated: boolean;
  sessionReady: boolean;
  currentUser: CurrentUser | null;
};

const AuthSessionContext = createContext<AuthSessionState | undefined>(undefined);

export function AuthSessionProvider({
  value,
  children,
}: {
  value: AuthSessionState;
  children: React.ReactNode;
}) {
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }

  return context;
}
