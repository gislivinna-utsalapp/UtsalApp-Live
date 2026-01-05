// client/src/lib/api.ts

// Les grunnslóð á API (ef hún er skilgreind), annars notum við relative slóðir
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

// Samræmdir token-lyklar
const TOKEN_KEY = "utsalapp_token";
const LEGACY_TOKEN_KEY = "token";

// Býr til fulla URL út frá relative path + mögulegri base-url
function buildUrl(path: string): string {
  // Ef path er þegar absolute (http/https)
  if (/^https?:\/\//i.test(path)) return path;

  // Engin skilgreind base-url: notum relative slóð (virkar þegar FE+BE eru á sama origin)
  if (!API_BASE_URL) return path;

  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function readToken(): string | null {
  try {
    // Prefer “new” key, fall back to legacy
    return (
      localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

function withAuthHeaders(
  headers: Record<string, string>,
  { includeAuth = true }: { includeAuth?: boolean } = {},
): Record<string, string> {
  if (!includeAuth) return headers;

  const token = readToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Debug helper: keyrðu þetta í console eða sýndu í UI ef þarf
 */
export function getAuthDebug() {
  const token = readToken();
  return {
    apiBaseUrl: API_BASE_URL || "(empty → relative /api calls)",
    hasToken: Boolean(token),
    tokenPreview: token ? `${token.slice(0, 12)}…${token.slice(-8)}` : null,
    tokenKeyUsed: token
      ? localStorage.getItem(TOKEN_KEY)
        ? TOKEN_KEY
        : LEGACY_TOKEN_KEY
      : null,
  };
}

/**
 * Sameiginlegt API-fall:
 * - Styður bæði JSON og FormData
 * - Bætir við Authorization ef token er til
 * - Sendir credentials (cookies/session) sjálfgefið
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // Setjum JSON Content-Type bara ef EKKI FormData og ef notandi hefur ekki þegar skilgreint.
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  withAuthHeaders(headers);

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    let msg = `API error ${res.status} ${res.statusText}`;

    if (rawText) {
      if (contentType.includes("application/json")) {
        try {
          const j = JSON.parse(rawText) as any;
          if (j?.message) msg += ` – ${j.message}`;
          else msg += ` – ${rawText}`;
        } catch {
          msg += ` – ${rawText}`;
        }
      } else {
        msg += ` – ${rawText}`;
      }
    }

    throw new Error(msg);
  }

  if (!rawText) return undefined as T;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText) as T;
    } catch {
      return rawText as unknown as T;
    }
  }

  return rawText as unknown as T;
}

/**
 * Sér fall fyrir uploads:
 * - POST FormData
 * - Setur credentials og Authorization ef token er til
 * - Setur EKKI Content-Type (browser sér um boundary)
 */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "method" | "body"> = {},
): Promise<T> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  withAuthHeaders(headers);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    let msg = `API error ${res.status} ${res.statusText}`;

    if (rawText) {
      if (contentType.includes("application/json")) {
        try {
          const j = JSON.parse(rawText) as any;
          if (j?.message) msg += ` – ${j.message}`;
          else msg += ` – ${rawText}`;
        } catch {
          msg += ` – ${rawText}`;
        }
      } else {
        msg += ` – ${rawText}`;
      }
    }

    throw new Error(msg);
  }

  if (!rawText) return undefined as T;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText) as T;
    } catch {
      return rawText as unknown as T;
    }
  }

  return rawText as unknown as T;
}
