import Image from 'next/image';
import Link from 'next/link';

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1f14 0%, #0d2b1c 50%, #071610 100%)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative flex items-center min-h-[200px] sm:min-h-[260px] px-4 sm:px-8">
        {/* Left — Logo + Text */}
        <div className="flex-1 z-10 py-8">
          {/* Logo Image */}
          <div className="mb-4">
            <Image
              src="/logo.png"
              alt="MiraclBet"
              width={140}
              height={60}
              className="object-contain"
              priority
            />
          </div>

          {/* Promo text */}
          <div className="mb-2">
            <span className="text-4xl sm:text-6xl font-black text-primary leading-none">+100%</span>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white mb-4 leading-tight">
            BONUS ON DEPOSIT
          </div>
          <div className="text-sm text-muted mb-6 max-w-xs">
            Register now and get a 100% welcome bonus on your first deposit. No limits on winnings!
          </div>

          <div className="flex gap-3">
            <Link href="/register">
              <button className="bg-primary text-dark font-black text-base px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                Sign Up Now
              </button>
            </Link>
            <Link href="/sports">
              <button className="border border-primary/50 text-primary font-semibold text-base px-6 py-3 rounded-lg hover:bg-primary/10 transition-colors">
                Bet Now
              </button>
            </Link>
          </div>
        </div>

        {/* Right — Sports Image */}
        <div className="hidden sm:block absolute right-0 top-0 h-full w-[45%] z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f14] via-transparent to-transparent z-10" />
          {/* Football field pattern overlay */}
          <div
            className="w-full h-full opacity-30"
            style={{
              background: `radial-gradient(ellipse at 70% 50%, #19E66B22 0%, transparent 70%)`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center z-0 opacity-40">
            {/* Football icon SVG */}
            <svg viewBox="0 0 200 200" className="w-64 h-64 text-primary" fill="none">
              <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="4" />
              <polygon points="100,20 120,55 85,55" fill="currentColor" opacity="0.6"/>
              <polygon points="165,65 148,92 130,75" fill="currentColor" opacity="0.6"/>
              <polygon points="155,135 130,125 143,100" fill="currentColor" opacity="0.6"/>
              <polygon points="100,178 85,148 115,148" fill="currentColor" opacity="0.6"/>
              <polygon points="46,135 57,100 70,125" fill="currentColor" opacity="0.6"/>
              <polygon points="36,65 70,75 53,92" fill="currentColor" opacity="0.6"/>
              <polygon points="100,55 130,75 120,108 100,120 80,108 70,75" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Carousel dots */}
      <div className="flex justify-center gap-2 pb-4">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-3 h-3 rounded-full bg-white/30" />
        <div className="w-3 h-3 rounded-full bg-white/30" />
      </div>
    </section>
  );
}
