import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent POS | MiraclBet',
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', color: '#111827' }}>
      {children}
    </div>
  );
}
