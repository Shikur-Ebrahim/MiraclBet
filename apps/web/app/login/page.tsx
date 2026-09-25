'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

      // Redirect based on role
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.user.role === 'WORKER') {
        router.push('/staff'); // placeholder for future
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 flex items-center justify-center min-h-[70vh]">
      <Container size="sm" className="max-w-md">
        <Card className="p-8 border border-brand">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded mx-auto flex items-center justify-center text-dark font-black text-2xl mb-4">M</div>
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="text-muted text-sm mt-2">Sign in to your MiraclBet account</p>
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
                  pattern="[0-9]{9}"
                  maxLength={9}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-dark border border-brand rounded-r px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="908456723"
                  title="Enter your 9-digit Ethiopian phone number"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-muted">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
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
