'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type WorkerSession = { phone: string; role: string; balance?: number; id?: string; privileges?: string[] };

const SECTION_PAGES: Record<string, { label: string; icon: string; href: string; color: string; bg: string }> = {
  'users':       { label: 'Users',             icon: '👤', href: '/admin/users',       color: '#3B82F6', bg: '#EFF6FF' },
  'deposits':    { label: 'Deposits',          icon: '💳', href: '/admin/deposits',    color: '#10B981', bg: '#ECFDF5' },
  'withdrawals': { label: 'Withdrawals',       icon: '💸', href: '/admin/withdrawals', color: '#F59E0B', bg: '#FFFBEB' },
  'bets':        { label: 'Bets / Tickets',    icon: '🎫', href: '/admin/bets',        color: '#EF4444', bg: '#FEF2F2' },
  'manual-bet':  { label: 'Manual Bet',        icon: '⚡', href: '/admin/manual-bet',  color: '#19E66B', bg: '#ECFDF5' },
};

export default function WorkerPortal() {
  const router = useRouter();
  const [user, setUser] = useState<WorkerSession | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('miraclbet_user');
    if (!savedUser) { router.push('/login'); return; }
    const parsed = JSON.parse(savedUser);
    if (parsed.role !== 'WORKER') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('miraclbet_user');
    router.push('/login');
  };

  if (!user) return null;

  const privileges: string[] = user.privileges || [];
  const allowedSections = Object.entries(SECTION_PAGES).filter(([key]) => privileges.includes(key));

  const shortId = user.id ? user.id.slice(-6).toUpperCase() : user.phone?.slice(-6) ?? '------';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sticky Top Bar */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '17px', color: '#111827', lineHeight: 1 }}>
            Miracl<span style={{ color: '#16A34A' }}>Bet</span>
            <span style={{
              marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#8B5CF6',
              background: '#F5F3FF', padding: '2px 7px', borderRadius: '999px', verticalAlign: 'middle',
            }}>WORKER</span>
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>ID: {shortId}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
            borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      {/* Page Content */}
      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            Worker Portal
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            You have limited access to these sections only.
          </p>
        </div>

        {allowedSections.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#fff', borderRadius: 16, border: '1px dashed #D1D5DB',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h3 style={{ color: '#111827', fontWeight: 800, fontSize: 18, margin: '0 0 8px' }}>
              No Sections Assigned
            </h3>
            <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
              Ask the admin to grant you access to sections.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {allowedSections.map(([key, item]) => (
              <Link
                key={key}
                href={item.href}
                style={{
                  background: '#FFFFFF',
                  border: `1.5px solid ${item.bg}`,
                  borderRadius: '16px',
                  padding: '20px 14px',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{
                  width: '46px', height: '46px', borderRadius: '14px',
                  background: item.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', color: item.color }} fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
