const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  country: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  is_live: boolean;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
}

async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 30 }, // revalidate every 30 seconds
    });
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    const data: T = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export const apiClient = {
  getLiveFixtures: () => apiFetch<Fixture[]>('/api/v1/fixtures/live'),
  getTodayFixtures: () => apiFetch<Fixture[]>('/api/v1/fixtures/today'),
  getFixturesByDate: (date: string) => apiFetch<Fixture[]>(`/api/v1/fixtures?date=${date}`),
  getSports: () => apiFetch<{ id: string; name: string; slug: string }[]>('/api/v1/sports'),
};
