// client/src/lib/auth.ts
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type UserRole = "user" | "store" | "admin";

type StoreInfo = {
  id: string;
  name: string;
  planType?: "basic" | "pro" | "premium";
  trialEndsAt?: string | null;
  billingActive?: boolean;
};

type User = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthUser = {
  user: User;
  store?: StoreInfo | null;
};

type AuthContextType = {
  authUser: AuthUser | null;
  isStore: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "utsalapp_auth_user";
const TOKEN_KEY = "utsalapp_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setAuthUser(parsed);
      }
    } catch (err) {
      console.error("Gat ekki lesið authUser úr localStorage", err);
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    setAuthUser(null);

    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setLoading(false);
      throw new Error(data?.message || "Innskráning mistókst");
    }

    if (!data?.user || !data?.token) {
      setLoading(false);
      throw new Error("Ógilt svar frá server við innskráningu.");
    }

    const authData: AuthUser = {
      user: data.user,
      store: data.store ?? null,
    };

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));

    setAuthUser(authData);
    setLoading(false);
  }

  async function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAuthUser(null);
  }

  const value: AuthContextType = {
    authUser,
    isStore: authUser?.user?.role === "store",
    isAdmin: authUser?.user?.role === "admin",
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
