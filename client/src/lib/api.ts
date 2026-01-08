// client/src/lib/api.ts

// Les grunnslóð á API (ef hún er skilgreind), annars notum við relative slóðir
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

// Býr til fulla URL út frá relative path + API base-url
function buildUrl(path: string): string {
  // Ef path er þegar absolute (http/https)
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

  // Grunn headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // Sækjum token úr localStorage og bætum við Bearer haus ef hann er til
  try {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ef localStorage er ekki til (t.d. SSR), sleppum bara
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    // Reynum að ná „message“ úr JSON ef hægt
    let msg = `API error ${res.status} ${res.statusText}`;
    if (rawText) {
      msg += ` – ${rawText}`;
    }
    throw new Error(msg);
  }

  if (!rawText) {
    // 204 No Content eða tómt svar
    return undefined as T;
  }

  // Reynum að parse-a sem JSON, annars skilum við bara texta
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return rawText as unknown as T;
  }
}
