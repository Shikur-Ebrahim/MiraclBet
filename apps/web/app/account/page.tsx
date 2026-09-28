'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type UserSession = { phone: string; role: string; balance?: number; id?: string };

export default function AccountPage() {
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
          <Lock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to view your account</h2>
          <button 
            onClick={() => window.location.href = '/login?redirect=/account'}
            className="px-6 py-3 bg-[#19E66B] text-black font-bold rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPwdMsg({ text: 'All fields are required.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
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
      
      let data;
      try {
        data = await res.json();
      } catch (err) {
        // If it fails to parse JSON, it's likely a 404 (endpoint not deployed)
        throw new Error('API not available. Please restart backend.');
      }

      if (res.ok && data.success) {
        setPwdMsg({ text: 'Password successfully updated! ?"', type: 'success' });
        setOldPassword('');
        setNewPassword('');
      } else {
        setPwdMsg({ text: data.error || 'Incorrect current password.', type: 'error' });
      }
    } catch (err: any) {
      setPwdMsg({ text: err.message || 'Network error. Make sure the backend is updated.', type: 'error' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 flex justify-center items-center min-h-[75vh]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        
        <div className="bg-gray-50 px-6 py-6 border-b border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm mb-3">
            <ShieldCheck className="w-8 h-8 text-[#111827]" />
          </div>
          <h1 className="text-2xl font-black text-[#111827]">Account Security</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">{user.phone}</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleChangePassword} className="space-y-5">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-[#111827] font-medium focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none transition-all"
                placeholder="Enter current password"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-[#111827] font-medium focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none transition-all"
                placeholder="Min. 6 characters"
              />
            </div>

            {pwdMsg.text && (
              <div className={clsx(
                "p-4 rounded-xl text-sm font-bold text-center",
                pwdMsg.type === 'success' ? 'bg-[#10B981]/10 text-[#059669]' : 'bg-red-50 text-red-600 border border-red-100'
              )}>
                {pwdMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full flex items-center justify-center gap-2 py-4 mt-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl font-black text-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pwdLoading ? 'Updating...' : 'Save New Password'}
              {!pwdLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
