import Image from 'next/image';

export function HeroBanner() {
  return (
    <section className="w-full" style={{ background: '#07100C' }}>
      <div className="flex items-center justify-center py-6 px-4">
        <Image
          src="/logo.png"
          alt="MiraclBet"
          width={280}
          height={120}
          className="object-contain w-auto max-h-24 sm:max-h-32"
          priority
        />
      </div>
    </section>
  );
}
