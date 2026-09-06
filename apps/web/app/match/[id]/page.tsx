'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FullPageLoader } from '@/components/ui/Loader';

// We reuse the Fixture interface shape
interface MatchDetails {
  id: string;
  home_team: string;
  home_team_logo?: string;
  away_team: string;
  away_team_logo?: string;
  league: string;
  league_logo_url?: string;
  country: string;
  kickoff_at: string;
  status: string;
  elapsed?: number;
  home_score: number | null;
  away_score: number | null;
  is_live: boolean;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  advanced_odds?: {
    match_winner?: { value: string; odd: string }[];
    over_under?: { value: string; odd: string }[];
    btts?: { value: string; odd: string }[];
    double_chance?: { value: string; odd: string }[];
  };
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
    
    // Quick way to find the match: fetch live, if not there, fetch today, tomorrow...
    const findMatch = async () => {
      try {
        const liveRes = await fetch(`${API_BASE}/api/v1/fixtures/live`).then(r => r.json());
        let found = liveRes.find((f: MatchDetails) => f.id === id);
        
        if (!found) {
           const today = new Date().toISOString().split('T')[0];
           const todayRes = await fetch(`${API_BASE}/api/v1/fixtures?date=${today}`).then(r => r.json());
           found = (Array.isArray(todayRes) ? todayRes : []).find((f: MatchDetails) => f.id === id);
        }

        if (!found) {
           // check tomorrow
           const tmrw = new Date();
           tmrw.setDate(tmrw.getDate() + 1);
           const tDate = tmrw.toISOString().split('T')[0];
           const tomorrowRes = await fetch(`${API_BASE}/api/v1/fixtures?date=${tDate}`).then(r => r.json());
           found = (Array.isArray(tomorrowRes) ? tomorrowRes : []).find((f: MatchDetails) => f.id === id);
        }

        if (found) {
          setMatch(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    findMatch();
  }, [id]);

  if (loading) return <FullPageLoader />;
  if (!match) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#0A0E1A]">
      <p className="text-xl mb-4">Match not found</p>
      <button onClick={() => router.back()} className="px-4 py-2 bg-[#19E66B] text-black font-bold rounded">Go Back</button>
    </div>
  );

  const kickoff = new Date(match.kickoff_at);

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#132012] border-b border-[#1C3026] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-white/70 hover:text-white">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-bold tracking-wide">MATCH DETAILS</span>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Scoreboard */}
        <div className="bg-[#111827] px-4 py-6 border-b border-white/5 relative overflow-hidden">
           {/* Background blur effect */}
           <div className="absolute top-0 inset-x-0 h-1/2 bg-[#19E66B]/10 blur-xl"></div>
           
           <div className="text-center text-sm font-semibold text-[#19E66B] mb-4 uppercase tracking-wider relative z-10 flex items-center justify-center gap-2">
             {match.league_logo_url && <Image src={match.league_logo_url} width={16} height={16} alt="" unoptimized />}
             {match.league}
           </div>

           <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-16 h-16 bg-white rounded-full p-2 flex items-center justify-center">
                  {match.home_team_logo ? (
                    <Image src={match.home_team_logo} alt={match.home_team} width={48} height={48} className="object-contain" unoptimized />
                  ) : <span className="text-2xl">?</span>}
                </div>
                <span className="text-sm font-bold text-center leading-tight">{match.home_team}</span>
              </div>

              <div className="flex flex-col items-center justify-center px-4">
                {match.is_live ? (
                  <>
                    <span className="text-red-500 font-bold text-xs animate-pulse mb-1">
                      {match.elapsed ? `${match.elapsed}'` : match.status}
                    </span>
                    <span className="text-3xl font-black">{match.home_score} - {match.away_score}</span>
                  </>
                ) : (
                  <>
                    <span className="text-white/40 text-xs mb-1">{kickoff.toLocaleDateString([], {day: '2-digit', month: '2-digit'})}</span>
                    <span className="text-2xl font-bold">{kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-16 h-16 bg-white rounded-full p-2 flex items-center justify-center">
                  {match.away_team_logo ? (
                    <Image src={match.away_team_logo} alt={match.away_team} width={48} height={48} className="object-contain" unoptimized />
                  ) : <span className="text-2xl">?</span>}
                </div>
                <span className="text-sm font-bold text-center leading-tight">{match.away_team}</span>
              </div>
           </div>
        </div>

        {/* Betting Markets */}
        <div className="px-3 py-4 space-y-4">
          
          {/* Main Market: 1X2 */}
          <div className="bg-[#111827] rounded-xl overflow-hidden border border-white/5">
            <div className="px-4 py-3 bg-[#1A2634] font-bold text-sm text-white/90">
              Match Winner
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {[
                { name: '1', val: match.advanced_odds?.match_winner?.find(m => m.value === 'Home')?.odd || match.odds_home.toFixed(2) },
                { name: 'X', val: match.advanced_odds?.match_winner?.find(m => m.value === 'Draw')?.odd || match.odds_draw.toFixed(2) },
                { name: '2', val: match.advanced_odds?.match_winner?.find(m => m.value === 'Away')?.odd || match.odds_away.toFixed(2) }
              ].map(opt => (
                <button key={opt.name} className="flex flex-col items-center justify-center bg-[#233142] hover:bg-[#2C3D52] rounded-lg py-3 transition-colors">
                  <span className="text-xs text-white/50 mb-1">{opt.name}</span>
                  <span className="text-sm font-bold text-[#19E66B]">{opt.val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Over/Under Market */}
          {(match.advanced_odds?.over_under && match.advanced_odds.over_under.length > 0) && (
            <div className="bg-[#111827] rounded-xl overflow-hidden border border-white/5">
              <div className="px-4 py-3 bg-[#1A2634] font-bold text-sm text-white/90">
                Over/Under Goals
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                  {match.advanced_odds.over_under.slice(0, 6).map((ou, i) => (
                    <button key={i} className="flex justify-between items-center bg-[#233142] hover:bg-[#2C3D52] rounded-lg px-4 py-3 transition-colors">
                      <span className="text-xs font-semibold text-white/80">{ou.value}</span>
                      <span className="text-sm font-bold text-[#19E66B]">{ou.odd}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Both Teams to Score */}
          {(match.advanced_odds?.btts && match.advanced_odds.btts.length > 0) && (
            <div className="bg-[#111827] rounded-xl overflow-hidden border border-white/5">
              <div className="px-4 py-3 bg-[#1A2634] font-bold text-sm text-white/90">
                Both Teams To Score
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {match.advanced_odds.btts.map((btts, i) => (
                  <button key={i} className="flex justify-between items-center bg-[#233142] hover:bg-[#2C3D52] rounded-lg px-4 py-3 transition-colors">
                    <span className="text-xs font-semibold text-white/80">{btts.value}</span>
                    <span className="text-sm font-bold text-[#19E66B]">{btts.odd}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Double Chance */}
          {(match.advanced_odds?.double_chance && match.advanced_odds.double_chance.length > 0) && (
            <div className="bg-[#111827] rounded-xl overflow-hidden border border-white/5">
              <div className="px-4 py-3 bg-[#1A2634] font-bold text-sm text-white/90">
                Double Chance
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {match.advanced_odds.double_chance.map((dc, i) => (
                  <button key={i} className="flex flex-col items-center justify-center bg-[#233142] hover:bg-[#2C3D52] rounded-lg py-3 transition-colors">
                    <span className="text-[10px] text-center text-white/50 mb-1">{dc.value}</span>
                    <span className="text-sm font-bold text-[#19E66B]">{dc.odd}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
