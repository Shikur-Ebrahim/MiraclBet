'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on admin/agent/worker/auth pages — they have their own layouts
  const hideOn = ['/admin', '/agent', '/worker', '/login', '/register'];
  if (hideOn.some(p => pathname.startsWith(p))) return null;

  const handleSportSelect = (sport: string) => {
    // Fire custom event so HomeSportsSection can react when on home page
    window.dispatchEvent(new CustomEvent('miraclbet_sidebar_sport', { detail: sport }));
    if (pathname !== '/') router.push('/');
  };

  const handleLeagueSelect = (id: string, name: string) => {
    window.dispatchEvent(new CustomEvent('miraclbet_sidebar_league', { detail: { id, name } }));
    if (pathname !== '/') router.push('/');
  };

  return (
    <div className="hidden md:block">
      <Sidebar
        isOpen={true}
        onClose={() => {}}
        onSelectSport={handleSportSelect}
        onSelectLeague={handleLeagueSelect}
      />
    </div>
  );
}
