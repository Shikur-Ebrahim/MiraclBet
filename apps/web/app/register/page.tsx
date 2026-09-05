'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="py-20 flex items-center justify-center min-h-[70vh]">
      <Container size="sm" className="max-w-lg">
        <Card className="p-8 border border-brand">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-muted text-sm mt-2">Join MiraclBet and start winning today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
                placeholder="you@example.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Confirm</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Date of Birth</label>
              <input 
                type="date" 
                required
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div className="flex items-start gap-3 mt-6">
              <input type="checkbox" id="terms" required className="mt-1" />
              <label htmlFor="terms" className="text-xs text-muted">
                I confirm that I am over 18 years of age and accept the <a href="#" className="text-gold hover:underline">Terms & Conditions</a> and <a href="#" className="text-gold hover:underline">Privacy Policy</a>.
              </label>
            </div>

            <Button type="submit" className="w-full font-bold mt-6" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link href="/login" className="text-gold hover:underline font-medium">Sign In</Link>
          </p>
        </Card>
      </Container>
    </div>
  );
}
