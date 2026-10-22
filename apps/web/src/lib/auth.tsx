import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    void loadMe();
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
      navigate("/dashboard");
    },
    [loadMe, navigate],
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
      navigate("/dashboard");
    },
    [loadMe, navigate],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

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
