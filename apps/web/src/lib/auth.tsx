"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "./api";

export interface CurrentUser {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  firmWidePermissions: string[];
  clientPermissions: Record<string, string[]>;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerFirm: (input: {
    firmName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string, clientId?: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadMe = useCallback(async () => {
    try {
      const me = await api<CurrentUser>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(accessToken);
      await loadMe();
      router.push("/dashboard");
    },
    [loadMe, router],
  );

  const registerFirm = useCallback(
    async (input: { firmName: string; email: string; password: string; firstName: string; lastName: string }) => {
      const { accessToken } = await api<{ accessToken: string }>("/auth/register-firm", {
        method: "POST",
        body: input,
        auth: false,
      });
      setToken(accessToken);
      await loadMe();
      router.push("/dashboard");
    },
    [loadMe, router],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasPermission = useCallback(
    (permission: string, clientId?: string) => {
      if (!user) return false;
      if (user.firmWidePermissions.includes(permission)) return true;
      if (clientId && user.clientPermissions[clientId]?.includes(permission)) return true;
      return false;
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, registerFirm, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
