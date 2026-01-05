// client/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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
 * Samræmt apiRequest sem fer í gegnum apiFetch:
 * - styður relative paths (/api/v1/...) og absolute urls (http...)
 * - sendir JSON body sjálfgefið ef body er object/string
 * - credentials + auth headers eru handled í apiFetch
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  body?: unknown,
  extraInit: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(extraInit.headers as Record<string, string> | undefined),
  };

  // Ef body er FormData: láttu apiFetch sjá um Content-Type
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  let requestBody: BodyInit | undefined = undefined;

  if (typeof body !== "undefined") {
    if (isFormData) {
      requestBody = body as FormData;
    } else if (typeof body === "string") {
      requestBody = body;
      // Setjum Content-Type ef ekki þegar skilgreint
      if (!headers["Content-Type"])
        headers["Content-Type"] = "application/json";
    } else {
      // object/array/number/bool -> JSON
      requestBody = JSON.stringify(body);
      if (!headers["Content-Type"])
        headers["Content-Type"] = "application/json";
    }
  }

  return apiFetch<T>(url, {
    ...extraInit,
    method,
    headers,
    body: requestBody,
  });
}
