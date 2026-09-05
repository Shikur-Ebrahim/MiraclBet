'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="py-20 flex items-center justify-center min-h-[70vh]">
      <Container size="sm" className="max-w-md">
        <Card className="p-8 border border-brand">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gold rounded mx-auto flex items-center justify-center text-dark font-black text-2xl mb-4">M</div>
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="text-muted text-sm mt-2">Sign in to your MiraclBet account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-muted">Password</label>
                <Link href="/forgot-password" className="text-xs text-gold hover:underline">Forgot?</Link>
              </div>
              <input 
                type="password" 
                required
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full font-bold mt-6" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don&apos;t have an account? <Link href="/register" className="text-gold hover:underline font-medium">Register here</Link>
          </p>
        </Card>
      </Container>
    </div>
  );
}
