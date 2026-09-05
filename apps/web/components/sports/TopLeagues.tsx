import Image from 'next/image';
import Link from 'next/link';

const TOP_LEAGUES = [
  { id: '2',   name: 'UEFA Champions League', country: 'Football' },
  { id: '5',   name: 'UEFA Nations League',   country: 'Football' },
  { id: '140', name: 'Spain. La Liga',         country: 'Football' },
  { id: '3',   name: 'UEFA Conference',        country: 'Football' },
  { id: '13',  name: 'Copa Libertadores',      country: 'Football' },
  { id: '235', name: 'Russia. Premier L.',     country: 'Football' },
  { id: '39',  name: 'England. Premier...',    country: 'Football' },
  { id: '78',  name: 'Germany. Bundesliga',    country: 'Football' },
  { id: '135', name: 'Italy. Serie A',         country: 'Football' },
  { id: '61',  name: 'France. Ligue 1',        country: 'Football' },
];

export function TopLeagues() {
  return (
    <section style={{ background: '#0D1913' }} className="border-b border-brand">
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Top Leagues</h2>
          <Link href="/sports" className="text-xs text-primary font-semibold">All</Link>
        </div>
        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {TOP_LEAGUES.map((league) => (
            <Link
              key={league.id}
              href={`/sports/football?league=${league.id}`}
              className="flex flex-col items-center gap-2 min-w-[72px] group"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center border border-brand group-hover:border-primary transition-colors"
                style={{ background: '#132012' }}
              >
                <Image
                  src={`https://media.api-sports.io/football/leagues/${league.id}.png`}
                  alt={league.name}
                  width={40}
                  height={40}
                  className="object-contain"
                  unoptimized
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted font-medium leading-tight">{league.country}</div>
                <div className="text-xs text-white/70 leading-tight truncate max-w-[72px]">{league.name.replace('Football. ', '')}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
