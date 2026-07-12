import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/types/domain";
import { authApi } from "@/lib/api/services";
import { isMockMode } from "@/lib/api/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const USER_KEY = "transitops.user";
const TOKEN_KEY = "transitops.token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function restore() {
      try {
        const raw = window.localStorage.getItem(USER_KEY);
        if (raw) setUser(JSON.parse(raw) as User);
        if (!isMockMode()) {
          const { user, token } = await authApi.refresh();
          if (!alive) return;
          window.localStorage.setItem(USER_KEY, JSON.stringify(user));
          window.localStorage.setItem(TOKEN_KEY, token);
          setUser(user);
        }
      } catch {
        window.localStorage.removeItem(USER_KEY);
        window.localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void restore();
    return () => {
      alive = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await authApi.login(email, password);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  };

  const logout = () => {
    void authApi.logout();
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
