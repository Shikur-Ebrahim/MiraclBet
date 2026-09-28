'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Lock, Settings, Phone, Calendar, Shield, Activity, Save } from 'lucide-react';
import { clsx } from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

export default function AccountPage() {
  const [tab, setTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [user, setUser] = useState<UserSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
  }, []);

  if (!mounted) return null;

  if (!user) {
    return (
      <div className="py-20 flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to view your account</h2>
          <Button onClick={() => window.location.href = '/login?redirect=/account'}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPwdMsg({ text: 'All fields are required', type: 'error' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API}/api/v1/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPwdMsg({ text: 'Password changed successfully!', type: 'success' });
        setOldPassword('');
        setNewPassword('');
      } else {
        setPwdMsg({ text: data.error || 'Failed to change password', type: 'error' });
      }
    } catch {
      setPwdMsg({ text: 'Network error. Try again.', type: 'error' });
    } finally {
      setPwdLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ] as const;

  return (
    <div className="py-8 lg:py-12">
      <Container size="lg">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Account Settings</h1>
          <p className="text-muted">Manage your personal information and security preferences.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <Card className="p-2 sticky top-24 bg-card border-brand">
              <nav className="flex flex-col gap-1">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all text-left',
                      tab === t.id ? 'bg-surface text-gold' : 'text-gray-400 hover:bg-surface hover:text-white'
                    )}
                  >
                    <t.icon className="w-5 h-5" />
                    {t.label}
                  </button>
                ))}
                <div className="my-2 border-t border-brand" />
                <button
                  onClick={() => { localStorage.removeItem('miraclbet_user'); window.location.href = '/'; }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all text-left"
                >
                  <Lock className="w-5 h-5" />
                  Sign Out
                </button>
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            
            {/* PROFILE TAB */}
            {tab === 'profile' && (
              <div className="space-y-6">
                <Card className="p-6 bg-card border-brand">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-4 border-surface shadow-xl">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{user.phone}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-surface text-muted px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                          {user.role}
                        </span>
                        <span className="text-muted text-sm flex items-center gap-1">
                          <Activity className="w-3 h-3 text-green-500" /> Active Account
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                      <div className="flex items-center gap-3 bg-surface border border-brand rounded-lg px-4 py-3">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <span className="text-white font-semibold">{user.phone}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Phone number cannot be changed once registered.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Account ID</label>
                      <div className="flex items-center gap-3 bg-surface border border-brand rounded-lg px-4 py-3">
                        <User className="w-5 h-5 text-gray-500" />
                        <span className="text-white font-mono text-sm">{user.id || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* SECURITY TAB */}
            {tab === 'security' && (
              <div className="space-y-6">
                <Card className="p-6 bg-card border-brand">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gold" />
                    Change Password
                  </h2>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-bold text-gray-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        className="w-full bg-surface border border-brand rounded-lg px-4 py-3 text-white focus:border-gold outline-none transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-300 mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-surface border border-brand rounded-lg px-4 py-3 text-white focus:border-gold outline-none transition-colors"
                        placeholder="Min. 6 characters"
                      />
                    </div>

                    {pwdMsg.text && (
                      <div className={clsx("p-3 rounded-lg text-sm font-bold", pwdMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
                        {pwdMsg.text}
                      </div>
                    )}

                    <Button type="submit" variant="primary" disabled={pwdLoading} className="w-full">
                      {pwdLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                </Card>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {tab === 'preferences' && (
              <div className="space-y-6">
                <Card className="p-6 bg-card border-brand">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gold" />
                    Site Preferences
                  </h2>
                  
                  <div className="space-y-6 max-w-lg">
                    {/* Odds Format */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3">Odds Format</h3>
                      <div className="flex gap-3">
                        <button className="flex-1 bg-surface border-2 border-gold rounded-lg py-2 text-white font-bold">Decimal</button>
                        <button className="flex-1 bg-surface border-2 border-transparent rounded-lg py-2 text-gray-400 hover:text-white font-bold opacity-50 cursor-not-allowed">Fractional</button>
                        <button className="flex-1 bg-surface border-2 border-transparent rounded-lg py-2 text-gray-400 hover:text-white font-bold opacity-50 cursor-not-allowed">American</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Currently only Decimal odds are supported.</p>
                    </div>

                    <div className="border-t border-brand" />

                    {/* Theme */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3">Theme</h3>
                      <div className="flex gap-3">
                        <button className="flex-1 bg-surface border-2 border-gold rounded-lg py-2 text-white font-bold">Dark</button>
                        <button className="flex-1 bg-surface border-2 border-transparent rounded-lg py-2 text-gray-400 hover:text-white font-bold opacity-50 cursor-not-allowed">Light</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Currently locked to Dark Sportsbook theme.</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>
      </Container>
    </div>
  );
}
