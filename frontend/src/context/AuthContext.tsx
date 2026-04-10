import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import type { User } from '../types';
import { getMe, logout as apiLogout } from '../api/auth';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  loginSuccess: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const ran = useRef(false);

  // Bij mount: controleer of er een geldige sessie (cookie) is
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Wordt aangeroepen na een geslaagde login (cookie is al gezet door de backend)
  const loginSuccess = useCallback(async () => {
    const me = await getMe();
    setUser(me);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await getMe();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    apiLogout().catch(() => {});  // Best-effort: cookie clearen op server
    setUser(null);
  }, []);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';
  const isOrganizer = isAdmin || user?.role === 'organizer';

  return (
    <Ctx.Provider value={{ user, loading, isLoggedIn, isAdmin, isOrganizer, loginSuccess, refreshUser, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
