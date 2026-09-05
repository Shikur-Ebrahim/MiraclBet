export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp?: string;
}

export interface Sport {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  is_active: boolean;
  fixture_count?: number;
}

export interface League {
  id: string;
  sport_id: string;
  name: string;
  country?: string;
  logo_url?: string;
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
}

export interface Fixture {
  id: string;
  league_id: string;
  home_team: Team;
  away_team: Team;
  kickoff_at: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  score?: { home: number; away: number };
}

export interface Market {
  id: string;
  fixture_id: string;
  name: string;
  selections: Selection[];
}

export interface Selection {
  id: string;
  market_id: string;
  name: string;
  odds: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}
