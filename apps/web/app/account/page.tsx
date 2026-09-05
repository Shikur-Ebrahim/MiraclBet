'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Lock, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export default function AccountPage() {
  const [tab, setTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Simulated logged-in state. In reality, check auth context.
  const isLoggedIn = false;

  if (!isLoggedIn) {
    return (
      <div className="py-20 flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to view your account</h2>
          <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <Container size="lg">
        <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 space-y-2">
            <button 
              onClick={() => setTab('profile')}
              className={clsx('w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors', tab === 'profile' ? 'bg-surface text-gold border border-brand' : 'text-muted hover:bg-surface/50')}
            >
              <User className="w-5 h-5" /> Profile
            </button>
            <button 
              onClick={() => setTab('security')}
              className={clsx('w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors', tab === 'security' ? 'bg-surface text-gold border border-brand' : 'text-muted hover:bg-surface/50')}
            >
              <Lock className="w-5 h-5" /> Security
            </button>
            <button 
              onClick={() => setTab('preferences')}
              className={clsx('w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors', tab === 'preferences' ? 'bg-surface text-gold border border-brand' : 'text-muted hover:bg-surface/50')}
            >
              <Settings className="w-5 h-5" /> Preferences
            </button>
          </div>

          <div className="flex-1">
            <Card className="p-8 border border-brand">
              {tab === 'profile' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 text-white">Personal Information</h2>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">Full Name</label>
                      <input type="text" defaultValue="John Doe" className="w-full bg-dark border border-brand rounded px-4 py-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">Email</label>
                      <input type="email" defaultValue="user@example.com" disabled className="w-full bg-dark/50 border border-brand/50 rounded px-4 py-2 text-muted cursor-not-allowed" />
                    </div>
                    <Button className="mt-4">Save Changes</Button>
                  </div>
                </div>
              )}
              {tab === 'security' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 text-white">Change Password</h2>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">Current Password</label>
                      <input type="password" className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:border-gold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">New Password</label>
                      <input type="password" className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:border-gold focus:outline-none" />
                    </div>
                    <Button className="mt-4">Update Password</Button>
                  </div>
                </div>
              )}
              {tab === 'preferences' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 text-white">Platform Preferences</h2>
                  <div className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">Odds Format</label>
                      <select className="w-full bg-dark border border-brand rounded px-4 py-2 text-white focus:border-gold focus:outline-none">
                        <option value="decimal">Decimal (e.g. 1.50)</option>
                        <option value="fractional">Fractional (e.g. 1/2)</option>
                        <option value="american">American (e.g. -200)</option>
                      </select>
                    </div>
                    <Button className="mt-4">Save Preferences</Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
