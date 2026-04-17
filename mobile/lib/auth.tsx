import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { sdk, TOKEN_KEY } from './medusa';

type AdminUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  metadata?: Record<string, unknown> | null;
};

function resolveIsAdmin(user: AdminUser): boolean {
  const role = typeof user.metadata?.role === 'string' ? user.metadata.role : null;
  if (role === 'admin') return true;
  if (role === 'employee') return false;
  const bootstrapEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  return !!bootstrapEmail && user.email.toLowerCase() === bootstrapEmail;
}

type AuthState = {
  user: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchCurrentUser(): Promise<AdminUser | null> {
  try {
    const { user } = await sdk.admin.user.me();
    return user as AdminUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      const me = await fetchCurrentUser();
      if (me) {
        setUser(me);
        setIsAdmin(resolveIsAdmin(me));
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await sdk.auth.login('user', 'emailpass', { email, password });
    if (typeof result !== 'string') {
      throw new Error('Additional authentication steps are not supported.');
    }
    const me = await fetchCurrentUser();
    if (!me) throw new Error('Could not load user.');
    setUser(me);
    setIsAdmin(resolveIsAdmin(me));
  };

  const logout = async () => {
    try {
      await sdk.auth.logout();
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
