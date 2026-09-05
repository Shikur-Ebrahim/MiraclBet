import type { HealthResponse, Sport, ApiResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const error = await res.text();
      return { data: null, error, status: res.status };
    }
    const data: T = await res.json();
    return { data, error: null, status: res.status };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error', status: 0 };
  }
}

export const apiClient = {
  getHealth: () => apiFetch<HealthResponse>('/health'),
  getSports: () => apiFetch<Sport[]>('/api/v1/sports'),
  getFixtures: (sportId?: string) => apiFetch<unknown[]>(`/api/v1/fixtures${sportId ? `?sport=${sportId}` : ''}`),
};
