import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UserProfile } from '../types';

interface ProfileContextValue {
  profile: UserProfile | null;
  unlock: (p: UserProfile) => void;
  lock: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const SESSION_KEY = 'fp_profile';

function getInitial(): UserProfile | null {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return (v as UserProfile) ?? null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(getInitial);

  function unlock(p: UserProfile) {
    try { sessionStorage.setItem(SESSION_KEY, p); } catch { /* noop */ }
    setProfile(p);
  }

  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    setProfile(null);
  }

  return (
    <ProfileContext.Provider value={{ profile, unlock, lock }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
