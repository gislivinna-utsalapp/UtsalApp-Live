// client/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Öruggt apiRequest sem:
 * - sendir JSON body ef til er
 * - sendir cookies (credentials: "include")
 * - reynir fyrst að lesa texta
 * - parse-ar JSON ef hægt, annars skilar texta eða kastar snyrtilegri villu
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  body?: unknown,
  extraInit: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(extraInit.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    ...extraInit,
  });

  const text = await res.text(); // lesum fyrst sem texta

  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // ekki gilt JSON
      if (!res.ok) {
        throw new Error(text || res.statusText);
      }
      // request tókst en svar er ekki JSON -> skila texta
      return text as any as T;
    }
  }

  if (!res.ok) {
    const message =
      (data && data.message) ||
      text ||
      `${res.status} ${res.statusText || "Unknown error"}`;
    throw new Error(message);
  }

  return data as T;
}
