'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid login');
      }

      // Save user session
      localStorage.setItem('miraclbet_user', JSON.stringify(data.user));

      // Fire custom event so Header updates instantly on same tab
      window.dispatchEvent(new Event('miraclbet_auth_change'));

      // Immediate redirect
      if (data.user.role === 'ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = redirect ? redirect : '/';
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4 pb-12 flex items-start justify-center min-h-[70vh]">
      <Container size="sm" className="max-w-md">
        <Card className="p-8 border border-brand relative">
          
          <button 
            onClick={() => { window.location.href = '/'; }}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="mb-8 -mx-8 -mt-8 rounded-t overflow-hidden relative" style={{ aspectRatio: '16/7', background: '#07100C' }}>
            <Image src="/logo.png" alt="MiraclBet" fill className="object-cover" priority />
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="text-muted text-sm mt-2">Sign in to your MiraclBet account</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l border border-r-0 border-brand bg-surface text-white font-semibold text-sm">
                  +251
                </span>
                <input 
                  type="tel" 
                  required
                  pattern="[0-9]{9}"
                  maxLength={9}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-dark border border-brand rounded-r px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="908456723"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark border border-brand rounded px-4 py-2 pr-10 text-white focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full font-bold mt-6" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline font-medium">Register here</Link>
          </p>
        </Card>
      </Container>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
