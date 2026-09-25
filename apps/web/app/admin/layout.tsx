import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | MiraclBet',
};

// This layout intentionally has NO Header, Footer, or BottomNav
// It renders only white-background admin content
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827' }}>
      {children}
    </div>
  );
}
