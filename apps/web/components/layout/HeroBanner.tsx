import Image from 'next/image';

export function HeroBanner() {
  return (
    <section className="w-full" style={{ background: '#07100C' }}>
      <div className="relative w-full" style={{ aspectRatio: '16/7' }}>
        <Image
          src="/logo.png"
          alt="MiraclBet"
          fill
          className="object-cover"
          priority
        />
      </div>
    </section>
  );
}
