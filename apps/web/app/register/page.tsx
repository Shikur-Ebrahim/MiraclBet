'use client';

import React, { useState } from 'react';
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
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validate phone number locally
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      // Show success state
      setSuccess(true);
      
      // Save user session
      localStorage.setItem('miraclbet_user', JSON.stringify(data.user));

      // Redirect after 2 seconds
      setTimeout(() => {
        if (data.user.role === 'ADMIN') router.push('/admin');
        else router.push('/');
      }, 2000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="pt-4 pb-12 flex items-start justify-center min-h-[70vh]">
        <Container size="sm" className="max-w-md">
          <Card className="p-8 border border-brand text-center relative">
            <div className="w-16 h-16 bg-[#19E66B]/20 text-[#19E66B] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Created!</h1>
            <p className="text-muted">You have successfully joined MiraclBet.</p>
            <p className="text-sm text-primary mt-4">Redirecting...</p>
          </Card>
        </Container>
      </div>
    );
  }

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

          <div className="mb-8 -mx-8 -mt-8 rounded-t overflow-hidden relative" style={{ aspectRatio: '16/7', background: '#07100C' }}>
            <Image src="/logo.png" alt="MiraclBet" fill className="object-cover" priority />
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-muted text-sm mt-2">Join MiraclBet and start winning today</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded mb-6 text-center">
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
                  title="Enter your 9-digit Ethiopian phone number starting with 9 or 7"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full font-bold mt-6" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </Card>
      </Container>
    </div>
  );
}
