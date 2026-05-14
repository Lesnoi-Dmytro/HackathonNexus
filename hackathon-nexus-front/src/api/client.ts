const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null as T;
  const body = (await res.json()) as { data: T };
  return body.data;
}
