'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    // Check if user is logged in and has ADMIN role
    const savedUser = localStorage.getItem('miraclbet_user');
    
    if (!savedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    
    if (parsedUser.role !== 'ADMIN') {
      router.push('/'); // Normal users kicked to homepage
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) return null; // Avoid flashing content before redirect

  return (
    <div className="py-10">
      <Container>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-muted">Welcome back, {user.full_name}</p>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => {
              localStorage.removeItem('miraclbet_user');
              router.push('/login');
            }}
          >
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border border-brand bg-[#0d1424]">
            <h3 className="text-lg font-semibold text-white mb-1">Total Users</h3>
            <p className="text-3xl font-black text-primary">1,248</p>
          </Card>
          <Card className="p-6 border border-brand bg-[#0d1424]">
            <h3 className="text-lg font-semibold text-white mb-1">Active Bets</h3>
            <p className="text-3xl font-black text-primary">342</p>
          </Card>
          <Card className="p-6 border border-brand bg-[#0d1424]">
            <h3 className="text-lg font-semibold text-white mb-1">Today&apos;s Revenue</h3>
            <p className="text-3xl font-black text-primary">Br 45,200</p>
          </Card>
        </div>

        <Card className="p-8 border border-brand">
          <h2 className="text-xl font-bold text-white mb-6">Manage Workers</h2>
          <div className="flex justify-between items-center bg-dark p-4 rounded border border-[#1E293B] mb-4">
            <div>
              <p className="text-white font-medium">Abebe Kebede</p>
              <p className="text-sm text-muted">Role: WORKER (Cashier)</p>
            </div>
            <Button variant="ghost" className="text-red-500 hover:bg-red-500/10">Revoke Access</Button>
          </div>
          <Button variant="primary" className="mt-4">
            + Create New Worker Account
          </Button>
        </Card>
      </Container>
    </div>
  );
}
