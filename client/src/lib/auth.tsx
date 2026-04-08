// client/src/lib/auth.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api";

/* =======================
   TYPES
======================= */

type UserRole = "user" | "store";

type StoreInfo = {
  id: string;
  name: string;
  planType?: "basic" | "pro" | "premium";
  trialEndsAt?: string | null;
  billingActive?: boolean;
  billingStatus?: string;
  address?: string;
  phone?: string;
  website?: string;
};

type User = {
  id: string;
  email: string;
  role: UserRole;
  isAdmin?: boolean;
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
  registerStore: (data: {
    storeName: string;
    email: string;
    password: string;
    address?: string;
    phone?: string;
    website?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

/* =======================
   CONTEXT + STORAGE KEYS
======================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "utsalapp_auth_user";
const TOKEN_KEY = "utsalapp_token";

const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "auth_user";
const LEGACY_STORE_KEY = "auth_store";

type LoginResponse = {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isAdmin?: boolean;
  };
  store?: StoreInfo | null;
  token: string;
};

/* =======================
   PROVIDER
======================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage
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

  /* ---------- LOGIN ---------- */
  async function login(email: string, password: string) {
    setLoading(true);
    setAuthUser(null);

    const normalizedEmail = (email ?? "").trim().toLowerCase();
    const trimmedPassword = (password ?? "").trim();

    try {
      const data = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: trimmedPassword,
        }),
      });

      if (!data?.user || !data?.token) {
        throw new Error("Ógilt svar frá server við innskráningu.");
      }

      const authData: AuthUser = {
        user: {
          ...data.user,
          isAdmin: data.user.isAdmin === true,
        },
        store: data.store ?? null,
      };

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));

      // legacy stuðningur
      localStorage.setItem(LEGACY_TOKEN_KEY, data.token);
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(authData.user));
      if (typeof data.store !== "undefined") {
        localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(data.store));
      }

      setAuthUser(authData);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- REGISTER STORE ---------- */
  async function registerStore(data: {
    storeName: string;
    email: string;
    password: string;
    address?: string;
    phone?: string;
    website?: string;
  }) {
    // Skrá verslun – backend á að setja session
    await apiFetch("/api/v1/stores/register", {
      method: "POST",
      body: JSON.stringify(data),
      credentials: "include",
    });

    // Sækja innskráðan notanda úr session (implicit auth)
    const me = await apiFetch("/api/v1/me", {
      credentials: "include",
    });

    // Setja notanda í state
    setAuthUser(me);
  }

  /* ---------- LOGOUT ---------- */
  async function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.removeItem(LEGACY_STORE_KEY);
    setAuthUser(null);
  }

  const value: AuthContextType = {
    authUser,
    isStore: authUser?.user?.role === "store",
    isAdmin: authUser?.user?.isAdmin === true,
    loading,
    login,
    registerStore,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} // 👈 LOKAR AuthProvider – MJÖG MIKILVÆGT

/* =======================
 USE AUTH HOOK
======================= */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
