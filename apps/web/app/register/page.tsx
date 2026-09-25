'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
          <div className="mb-8 -mx-8 -mt-8 rounded-t overflow-hidden relative" style={{ aspectRatio: '16/7', background: '#07100C' }}>
            <Image src="/logo.png" alt="MiraclBet" fill className="object-cover" priority />
          </div>
          
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
                className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                placeholder="Miracl"
              />
            </div>

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
                  className="w-full bg-dark border border-brand rounded-r px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="908456723"
                  title="Enter your 9-digit Ethiopian phone number"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 mt-6">
              <input type="checkbox" id="terms" required className="mt-1" />
              <label htmlFor="terms" className="text-xs text-muted">
                I confirm that I am over 18 years of age and accept the <a href="#" className="text-primary hover:underline">Terms & Conditions</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </label>
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
