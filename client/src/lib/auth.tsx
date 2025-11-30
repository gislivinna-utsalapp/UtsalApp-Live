// client/src/lib/auth.ts
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api";

type UserRole = "user" | "store" | "admin";

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// „Nýr“ lykill fyrir context
const AUTH_KEY = "utsalapp_auth_user";
const TOKEN_KEY = "utsalapp_token";

// Legacy-lyklar sem eldri kóði getur verið að nota
const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "auth_user";
const LEGACY_STORE_KEY = "auth_store";

type LoginResponse = {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  store?: StoreInfo | null;
  token: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hlaða sessjón úr localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setAuthUser(parsed);
      } else {
        // Backfill úr legacy lykli ef til
        const legacyUser = localStorage.getItem(LEGACY_USER_KEY);
        const legacyStore = localStorage.getItem(LEGACY_STORE_KEY);
        if (legacyUser) {
          const user = JSON.parse(legacyUser) as User;
          const store = legacyStore
            ? (JSON.parse(legacyStore) as StoreInfo)
            : null;
          const authData: AuthUser = { user, store };
          setAuthUser(authData);
          localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
        }
      }
    } catch (err) {
      console.error("Gat ekki lesið authUser úr localStorage", err);
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGIN notar apiFetch sem skilar JSON, ekki Response
  async function login(email: string, password: string) {
    setLoading(true);
    setAuthUser(null);

    try {
      const data = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data?.user || !data?.token) {
        throw new Error("Ógilt svar frá server við innskráningu.");
      }

      const authData: AuthUser = {
        user: data.user,
        store: data.store ?? null,
      };

      // Nýju lyklarnir
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));

      // LEGACY-lyklarnir fyrir aðra hluta appsins (t.d. upload, apiFetch o.s.frv.)
      localStorage.setItem(LEGACY_TOKEN_KEY, data.token);
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(data.user));
      if (typeof data.store !== "undefined") {
        localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(data.store));
      }

      setAuthUser(authData);
    } catch (err: any) {
      console.error("login error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Innskráning mistókst. Vinsamlegast reyndu aftur.";
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  // REGISTER STORE (þarf sjaldan úr contexti, en höldum honum hreinum)
  async function registerStore(data: {
    storeName: string;
    email: string;
    password: string;
    address?: string;
    phone?: string;
    website?: string;
  }) {
    await apiFetch("/api/v1/auth/register-store", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // LOG OUT – hreinsum bæði nýja og gamla lykla
  async function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);

    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.removeItem(LEGACY_STORE_KEY);

    setAuthUser(null);
  }

  const value: AuthContextType = {
    authUser,
    isStore: authUser?.user?.role === "store",
    isAdmin: authUser?.user?.role === "admin",
    loading,
    login,
    registerStore,
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
