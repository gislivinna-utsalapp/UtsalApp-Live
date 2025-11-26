// client/src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path: string) {
  // Ef path er þegar full slóð, skilar henni óbreyttri
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Tryggjum að path byrji á /
  if (!path.startsWith("/")) path = `/${path}`;

  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = apiUrl(path);

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
}
