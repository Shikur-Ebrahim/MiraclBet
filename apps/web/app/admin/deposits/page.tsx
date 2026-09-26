'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Deposit = {
  id: string;
  user_id: string;
  user_phone: string;
  provider_name: string;
  amount: number;
  screenshot_url: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal for screenshot
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/deposits`);
      if (res.ok) {
        const data = await res.json();
        setDeposits(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'accepted' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this deposit as ${status.toUpperCase()}?`)) return;
    
    setProcessingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/deposits/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        if (status === 'rejected') {
          // It's hard-deleted on backend, so remove it from list
          setDeposits(prev => prev.filter(d => d.id !== id));
        } else {
          setDeposits(prev => prev.map(d => d.id === id ? { ...d, status } : d));
        }
      } else {
        alert('Failed to update deposit status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to DELETE this deposit? If it was accepted, the user's balance will be reduced.`)) return;

    setProcessingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/admin/deposits/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setDeposits(prev => prev.filter(d => d.id !== id));
      } else {
        alert('Failed to delete deposit');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', color: '#111827' }} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>Deposit Requests</h1>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading...</div>
        ) : deposits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280', background: '#FFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            No deposit requests found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {deposits.map((deposit) => (
              <div key={deposit.id} style={{
                background: '#FFFFFF', borderRadius: '16px', padding: '16px',
                border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>User Phone</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{deposit.user_phone || 'Unknown'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A' }}>{Number(deposit.amount).toFixed(2)} Br</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  {/* Screenshot Thumbnail */}
                  <div 
                    onClick={() => setPreviewImage(deposit.screenshot_url)}
                    style={{ 
                      width: '60px', height: '80px', borderRadius: '8px', background: '#F3F4F6',
                      overflow: 'hidden', cursor: 'pointer', border: '1px solid #E5E7EB', flexShrink: 0
                    }}
                  >
                    <img src={deposit.screenshot_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  
                  {/* Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      {deposit.provider_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(deposit.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions or Status */}
                {deposit.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      disabled={processingId === deposit.id}
                      onClick={() => handleStatusUpdate(deposit.id, 'rejected')}
                      style={{
                        flex: 1, padding: '12px', background: '#FEF2F2', color: '#DC2626',
                        border: '1px solid #FECACA', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                        cursor: processingId === deposit.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === deposit.id ? 0.5 : 1
                      }}
                    >
                      Reject
                    </button>
                    <button 
                      disabled={processingId === deposit.id}
                      onClick={() => handleStatusUpdate(deposit.id, 'accepted')}
                      style={{
                        flex: 1, padding: '12px', background: '#16A34A', color: '#FFFFFF',
                        border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                        cursor: processingId === deposit.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === deposit.id ? 0.5 : 1
                      }}
                    >
                      {processingId === deposit.id ? 'Processing...' : 'Accept'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ 
                      flex: 1, padding: '10px', textAlign: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      background: deposit.status === 'accepted' ? '#DCFCE7' : '#FEF2F2',
                      color: deposit.status === 'accepted' ? '#16A34A' : '#DC2626'
                    }}>
                      {deposit.status.toUpperCase()}
                    </div>
                    <button
                      onClick={() => handleDelete(deposit.id)}
                      disabled={processingId === deposit.id}
                      style={{
                        padding: '10px 16px', background: '#FEF2F2', color: '#DC2626',
                        border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                        cursor: processingId === deposit.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === deposit.id ? 0.5 : 1
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
          }}
        >
          <img src={previewImage} alt="Receipt Preview" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          <button 
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute', top: '24px', right: '24px', background: '#111827', color: '#FFF',
              border: 'none', borderRadius: '20px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}