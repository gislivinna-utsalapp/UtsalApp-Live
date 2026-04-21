// client/src/lib/api.ts

// Les grunnslóð á API (ef hún er skilgreind), annars notum við relative slóðir
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

// Býr til fulla URL út frá relative path + API base-url
function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

// Sameiginlegt API-fall sem bætir við Authorization haus ef token er til
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  try {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // SSR fallback
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    // Extract just the Icelandic `message` field — never show raw HTTP status
    let msg = "Villa kom upp. Vinsamlegast reyndu aftur.";
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed?.message && typeof parsed.message === "string") {
          msg = parsed.message;
        } else if (parsed?.error && typeof parsed.error === "string") {
          msg = parsed.error;
        }
      } catch {
        if (res.status === 401) msg = "Rangt netfang eða lykilorð.";
        else if (res.status === 403) msg = "Aðgangur bannaður.";
        else if (res.status === 404) msg = "Fannst ekki.";
        else if (res.status >= 500) msg = "Villa á þjóni. Reyndu aftur síðar.";
      }
    }
    throw new Error(msg);
  }

  if (!rawText) {
    return undefined as T;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return rawText as unknown as T;
  }
}
