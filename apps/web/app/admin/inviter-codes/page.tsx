'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InviterCode {
  id: string;
  phone: string;
  code: string;
  user_id?: string;
  user_name?: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export default function AdminInviterCodesPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<InviterCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [newlyGenerated, setNewlyGenerated] = useState<InviterCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    // Auth check
    const savedUser = localStorage.getItem('miraclbet_user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(savedUser);
    if (parsed.role !== 'ADMIN' && parsed.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }

    fetchCodes();
  }, [router]);

  const fetchCodes = async () => {
    try {
      const res = await fetch(`${API}/api/v1/admin/inviter-codes`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch inviter codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setNewlyGenerated(null);

    const cleanPhone = phoneInput.trim();
    if (!cleanPhone) {
      setError('Please enter a user phone number');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/inviter-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to generate inviter code');
      }

      const created: InviterCode = await res.json();
      setNewlyGenerated(created);
      setCodes(prev => [created, ...prev]);
      setPhoneInput('');
      setSuccessMsg(`Generated code ${created.code} successfully for ${cleanPhone}!`);
    } catch (err: any) {
      setError(err.message || 'Error generating code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete inviter code "${code}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/api/v1/admin/inviter-codes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCodes(prev => prev.filter(c => c.id !== id));
        if (newlyGenerated?.id === id) {
          setNewlyGenerated(null);
        }
      } else {
        alert('Failed to delete inviter code');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting inviter code');
    }
  };

  const filteredCodes = codes.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.user_name && c.user_name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '14px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/admin"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: '#4B5563', textDecoration: 'none', fontSize: '13px',
              fontWeight: 700, padding: '6px 12px', background: '#F3F4F6',
              borderRadius: '8px', border: '1px solid #E5E7EB',
            }}
          >
            ← Dashboard
          </Link>
          <div style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>
            🎟️ Inviter Codes Management
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
          Total: <span style={{ color: '#7C3AED', fontWeight: 800 }}>{codes.length}</span> codes
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Info Banner */}
        <div style={{
          background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '12px',
          padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <span style={{ fontSize: '24px', lineHeight: 1 }}>ℹ️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#5B21B6', marginBottom: '4px' }}>
              Additional Withdrawal Rule: Inviter Code Verification
            </div>
            <div style={{ fontSize: '13px', color: '#6D28D9', lineHeight: 1.5 }}>
              When a user reaches the required deposit history (e.g. 8,999 Br), they will be prompted to enter their unique 9-character Inviter Code to complete withdrawal verification. Enter their phone number below to generate their unique code and copy it in 1-click.
            </div>
          </div>
        </div>

        {/* Generate Box */}
        <div style={{
          background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '22px', marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: '0 0 16px' }}>
            ⚡ Generate Unique Inviter Code
          </h2>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4B5563', marginBottom: '6px' }}>
                User Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. 0912345678 or 0712345678"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '9px',
                  border: '1.5px solid #D1D5DB', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ alignSelf: 'flex-end', flex: '0 0 auto' }}>
              <button
                type="submit"
                disabled={generating}
                style={{
                  background: generating ? '#9CA3AF' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  color: '#FFFFFF', border: 'none', borderRadius: '9px',
                  padding: '11px 22px', fontSize: '14px', fontWeight: 800,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {generating ? 'Generating...' : '+ Generate Inviter Code'}
              </button>
            </div>
          </form>

          {error && (
            <div style={{
              marginTop: '14px', padding: '10px 14px', background: '#FEF2F2',
              color: '#DC2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              border: '1px solid #FECACA',
            }}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && !newlyGenerated && (
            <div style={{
              marginTop: '14px', padding: '10px 14px', background: '#ECFDF5',
              color: '#059669', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              border: '1px solid #A7F3D0',
            }}>
              ✓ {successMsg}
            </div>
          )}

          {/* Newly Generated Code Highlight */}
          {newlyGenerated && (
            <div style={{
              marginTop: '18px', padding: '18px', background: '#F5F3FF',
              borderRadius: '12px', border: '2px dashed #8B5CF6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '14px',
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6D28D9', marginBottom: '4px' }}>
                  Newly Generated 9-Digit Inviter Code
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '2px', color: '#4C1D95', fontFamily: 'monospace' }}>
                  {newlyGenerated.code}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Phone: <strong style={{ color: '#111827' }}>{newlyGenerated.phone}</strong>
                  {newlyGenerated.user_name && ` • Name: ${newlyGenerated.user_name}`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(newlyGenerated.code)}
                style={{
                  background: copiedCode === newlyGenerated.code ? '#10B981' : '#7C3AED',
                  color: '#FFFFFF', border: 'none', borderRadius: '9px',
                  padding: '12px 20px', fontSize: '14px', fontWeight: 800,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                  transition: 'background 0.2s',
                }}
              >
                {copiedCode === newlyGenerated.code ? '✓ Copied to Clipboard!' : '📋 Copy Inviter Code'}
              </button>
            </div>
          )}
        </div>

        {/* Existing Codes Table */}
        <div style={{
          background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden',
        }}>
          {/* Table Header Controls */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Inviter Codes History
            </h3>
            <input
              type="text"
              placeholder="Search by phone, name, or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB',
                fontSize: '13px', outline: 'none', width: '240px',
              }}
            />
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
              Loading codes...
            </div>
          ) : filteredCodes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
              {searchQuery ? 'No matching codes found.' : 'No inviter codes generated yet.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Phone / User</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Inviter Code</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date Created</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map(item => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: newlyGenerated?.id === item.id ? '#FAF5FF' : '#FFFFFF',
                      }}
                    >
                      {/* Phone / User */}
                      <td style={{ padding: '12px 18px', color: '#111827' }}>
                        <div style={{ fontWeight: 700 }}>{item.phone}</div>
                        {item.user_name ? (
                          <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                            👤 {item.user_name}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Unmatched account</div>
                        )}
                      </td>

                      {/* Code + Copy */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 800, fontSize: '14px',
                            background: '#F3F4F6', padding: '4px 8px', borderRadius: '6px',
                            color: '#4C1D95', border: '1px solid #E5E7EB',
                          }}>
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code)}
                            title="Copy code"
                            style={{
                              background: copiedCode === item.code ? '#DCFCE7' : '#F3F4F6',
                              color: copiedCode === item.code ? '#16A34A' : '#4B5563',
                              border: '1px solid',
                              borderColor: copiedCode === item.code ? '#86EFAC' : '#D1D5DB',
                              borderRadius: '6px', padding: '4px 8px', fontSize: '11px',
                              fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {copiedCode === item.code ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 18px' }}>
                        {item.is_used ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: '#F3F4F6', color: '#6B7280', fontSize: '11px',
                            fontWeight: 700, padding: '3px 8px', borderRadius: '999px',
                            border: '1px solid #E5E7EB',
                          }}>
                            ✓ Verified & Used
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: '#DCFCE7', color: '#16A34A', fontSize: '11px',
                            fontWeight: 700, padding: '3px 8px', borderRadius: '999px',
                            border: '1px solid #BBF7D0',
                          }}>
                            ● Active (Ready)
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 18px', color: '#6B7280', fontSize: '12px' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.code)}
                          style={{
                            background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                            borderRadius: '6px', padding: '5px 10px', fontSize: '11px',
                            fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
