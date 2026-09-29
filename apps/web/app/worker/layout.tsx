import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Worker Portal | MiraclBet',
};

// No Header/Footer — same as admin layout, white background
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827' }}>
      {children}
    </div>
  );
}
