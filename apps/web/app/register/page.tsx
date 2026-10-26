'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState<boolean | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const qPromo = params.get('ref') || params.get('promo') || params.get('code');
      const saved = localStorage.getItem('miraclbet_promo_code');
      if (qPromo) {
        const clean = qPromo.trim().toUpperCase();
        setPromoCode(clean);
        localStorage.setItem('miraclbet_promo_code', clean);
      } else if (saved) {
        const clean = saved.trim().toUpperCase();
        setPromoCode(clean);
      }
    } catch {
      // ignore
    }
  }, []);

  // Validate promo code against super admin promo codes
  useEffect(() => {
    const clean = promoCode.trim().toUpperCase();
    if (!clean) {
      setPromoValid(null);
      setCheckingPromo(false);
      localStorage.removeItem('miraclbet_promo_code');
      return;
    }

    if (clean.length < 3) {
      setPromoValid(null);
      setCheckingPromo(false);
      return;
    }

    setCheckingPromo(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/auth/validate-promo?code=${encodeURIComponent(clean)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            setPromoValid(true);
            localStorage.setItem('miraclbet_promo_code', clean);
          } else {
            setPromoValid(false);
            localStorage.removeItem('miraclbet_promo_code');
          }
        } else {
          setPromoValid(null);
        }
      } catch {
        setPromoValid(null);
      } finally {
        setCheckingPromo(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [promoCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (phone.length !== 9 || (phone[0] !== '9' && phone[0] !== '7')) {
      setError('Please enter a valid Ethiopian phone number starting with 9 or 7');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443'}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, promo_code: promoCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      // Clear stored promo code after successful registration
      localStorage.removeItem('miraclbet_promo_code');

      // Show inline success message then redirect to login
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);

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
            onClick={() => router.push('/')}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="mb-6 -mx-8 -mt-8 rounded-t overflow-hidden relative" style={{ aspectRatio: '16/7', background: '#07100C' }}>
            <Image src="/logo.png" alt="MiraclBet" fill className="object-cover" priority />
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-muted text-sm mt-2">Join MiraclBet and start winning today</p>
          </div>

          {/* Promo code banner — shows prominently when code is valid */}
          {promoValid === true && promoCode && (
            <div style={{
              background: 'linear-gradient(135deg, #064E3B, #065F46)',
              border: '1.5px solid #10B981',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🏷️ Promo Code Applied
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#34D399', letterSpacing: '3px', marginTop: '2px' }}>
                  {promoCode}
                </div>
              </div>
              <span style={{
                background: '#10B981', color: '#fff', fontSize: '11px', fontWeight: 800,
                padding: '4px 10px', borderRadius: '999px'
              }}>✓ APPLIED</span>
            </div>
          )}

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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  pattern="[0-9]{9}"
                  maxLength={9}
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

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Promo Code field — always visible */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Promo / Referral Code <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={promoCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setPromoCode(val);
                  }}
                  maxLength={10}
                  className={`w-full bg-dark border rounded px-4 py-2 pr-28 text-white uppercase tracking-wider font-semibold focus:outline-none transition-colors ${
                    promoValid === true
                      ? 'border-green-500 focus:border-green-400'
                      : promoValid === false
                        ? 'border-amber-500/70 focus:border-amber-400'
                        : 'border-brand focus:border-primary'
                  }`}
                  placeholder="e.g. 9889"
                />
                {checkingPromo && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                    Checking...
                  </span>
                )}
                {!checkingPromo && promoValid === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded border border-green-500/30">
                    ✓ APPLIED
                  </span>
                )}
                {!checkingPromo && promoValid === false && promoCode.trim().length >= 3 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                    INVALID
                  </span>
                )}
              </div>
              {promoValid === false && promoCode.trim().length >= 3 && (
                <p className="text-[12px] text-amber-400/90 mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️ Unrecognized promo code. Please enter a valid Super Admin promo code, or leave blank to continue without one.</span>
                </p>
              )}
            </div>

            <Button type="submit" className="w-full font-bold mt-2" loading={loading}>
              Create Account
            </Button>

            {/* Inline success message — no card, just simple text */}
            {success && (
              <p className="text-center text-[#19E66B] text-sm font-semibold pt-1">
                ✓ Account created successfully! Redirecting to login...
              </p>
            )}
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </Card>
      </Container>
    </div>
  );
}
