'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Image as ImageIcon, X, AlertCircle,
  Check, CheckCheck, Loader2, ShieldAlert, Headphones
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';

type SupportMessage = {
  id: string;
  user_id: string;
  sender_role: 'USER' | 'ADMIN';
  message: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
};

export default function SupportChatPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id?: string; phone?: string; role?: string } | null>(null);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  // Selected image for upload preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Lightbox modal for viewing image full-screen
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Load user
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Fetch messages from backend
  const fetchMessages = async (showLoading = false) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/support/messages?user_id=${user.id}`);
      if (!res.ok) {
        if (res.status === 403) {
          setIsBlocked(true);
        }
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
      setIsBlocked(!!data.is_blocked);
    } catch (e) {
      console.error('Failed to load support messages:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load and auto-refresh loop (every 3 seconds)
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchMessages(true);
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoadRef.current) {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isFirstLoadRef.current = false;
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Handle image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorBanner('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorBanner('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorBanner('Image file exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const clearSelectedImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id || isBlocked || sending || uploadingImage) return;

    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    setSending(true);
    setErrorBanner('');

    let uploadedImageUrl = '';

    // 1. Upload photo if selected
    if (selectedFile) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const uploadRes = await fetch(`${API}/api/v1/support/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload image. Please try again.');
        }

        const uploadData = await uploadRes.json();
        uploadedImageUrl = uploadData.url || '';
      } catch (err: any) {
        setErrorBanner(err.message || 'Image upload failed');
        setSending(false);
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    // 2. Post message to backend
    try {
      const res = await fetch(`${API}/api/v1/support/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          message: trimmed,
          image_url: uploadedImageUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setIsBlocked(true);
          setErrorBanner('You are blocked from sending support messages.');
        } else {
          setErrorBanner(errData.error || 'Failed to send message.');
        }
        return;
      }

      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
      setText('');
      clearSelectedImage();
    } catch {
      setErrorBanner('Network error. Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // Helper to format timestamps
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (iso: string) => {
    try {
      const d = new Date(iso);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Today';
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Image full URL resolver
  const resolveImgUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API}${url}`;
  };

  if (!mounted) return null;

  // If user is not logged in
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Headphones size={32} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>MiraclBet Customer Support</h1>
        <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 320, margin: '0 0 24px', lineHeight: 1.5 }}>
          Please sign in to your account to chat live with our support team.
        </p>
        <button
          onClick={() => router.push('/login')}
          style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      background: '#FFFFFF',
      color: '#111827',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: 99999,
      overflow: 'hidden',
    }}>

      {/* ─── Top Header (White Backed) ─── */}
      <header style={{
        flexShrink: 0,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        height: '60px',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: '#F3F4F6',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Support Agent Avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: '#DCFCE7', color: '#15803D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '15px',
            }}>
              🎧
            </div>
            {/* Online Green Indicator Dot */}
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#16A34A', border: '2px solid #FFFFFF',
            }} />
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
              MiraclBet Support
            </div>
            <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              Live Online
            </div>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', background: '#F9FAFB', padding: '4px 10px', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          ID: {user.phone ? user.phone.slice(-6) : user.id?.slice(-6).toUpperCase()}
        </div>
      </header>

      {/* ─── Blocked Banner ─── */}
      {isBlocked && (
        <div style={{
          background: '#FEF2F2', borderBottom: '1.5px solid #FECACA',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
          color: '#DC2626', fontSize: '13px', fontWeight: 600,
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Support Chat Disabled:</strong> Your account has been restricted from sending support messages.
          </div>
        </div>
      )}

      {/* ─── Error Notification ─── */}
      {errorBanner && (
        <div style={{
          background: '#FFFBEB', borderBottom: '1px solid #FDE68A',
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#B45309', fontSize: '12px', fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Chat Message Scroll View ─── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#FFFFFF',
      }}>

        {/* Welcome Greeting card */}
        <div style={{
          margin: '4px auto 16px',
          maxWidth: '380px',
          textAlign: 'center',
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '16px',
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>👋</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
            Welcome to MiraclBet Live Support!
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0', lineHeight: 1.4 }}>
            How can we help you today? Send us your questions, issues, or deposit/withdrawal screenshots and an agent will reply shortly.
          </p>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0', color: '#9CA3AF' }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        {/* Messages */}
        {messages.map((m, idx) => {
          const isUser = m.sender_role === 'USER';
          const prevMsg = messages[idx - 1];
          const showDate = !prevMsg || formatDateLabel(prevMsg.created_at) !== formatDateLabel(m.created_at);

          return (
            <React.Fragment key={m.id || idx}>
              {showDate && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', background: '#F3F4F6', padding: '3px 10px', borderRadius: '12px' }}>
                    {formatDateLabel(m.created_at)}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: '8px',
              }}>
                {/* Agent Icon for incoming messages */}
                {!isUser && (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: '#DCFCE7', color: '#15803D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 800, flexShrink: 0, marginBottom: '2px',
                  }}>
                    🎧
                  </div>
                )}

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '82%',
                  background: isUser ? '#16A34A' : '#F3F4F6',
                  color: isUser ? '#FFFFFF' : '#111827',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: m.image_url ? '6px 6px 8px 6px' : '10px 14px',
                  boxShadow: isUser ? '0 2px 6px rgba(22,163,74,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {/* Photo if present */}
                  {m.image_url && (
                    <div style={{ marginBottom: m.message ? 8 : 4 }}>
                      <img
                        src={resolveImgUrl(m.image_url)}
                        alt="attachment"
                        onClick={() => setLightboxImg(resolveImgUrl(m.image_url!))}
                        style={{
                          width: '100%',
                          maxHeight: '260px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          display: 'block',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  )}

                  {/* Text content */}
                  {m.message && (
                    <div style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      padding: m.image_url ? '0 6px' : 0,
                    }}>
                      {m.message}
                    </div>
                  )}

                  {/* Timestamp & status indicator */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    marginTop: '4px',
                    fontSize: '10px',
                    color: isUser ? 'rgba(255,255,255,0.75)' : '#9CA3AF',
                    paddingRight: m.image_url ? '4px' : 0,
                  }}>
                    <span>{formatTime(m.created_at)}</span>
                    {isUser && (
                      m.is_read ? (
                        <CheckCheck size={13} style={{ color: '#E0F2FE' }} />
                      ) : (
                        <Check size={13} style={{ color: 'rgba(255,255,255,0.75)' }} />
                      )
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <div ref={chatEndRef} style={{ height: '10px' }} />
      </div>

      {/* ─── Bottom Input Bar (Mobile First) ─── */}
      <footer style={{
        flexShrink: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '10px 14px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
      }}>
        {/* Photo Preview Thumbnail */}
        {previewUrl && (
          <div style={{
            position: 'relative',
            display: 'inline-block',
            marginBottom: '8px',
            border: '2px solid #16A34A',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            <img src={previewUrl} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', display: 'block' }} />
            <button
              type="button"
              onClick={clearSelectedImage}
              style={{
                position: 'absolute', top: 2, right: 2,
                background: 'rgba(0,0,0,0.65)', color: '#fff',
                border: 'none', borderRadius: '50%',
                width: '18px', height: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
            disabled={isBlocked || sending}
          />

          {/* Attach Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBlocked || sending}
            title="Attach Screenshot or Photo"
            style={{
              background: previewUrl ? '#DCFCE7' : '#F3F4F6',
              color: previewUrl ? '#16A34A' : '#4B5563',
              border: previewUrl ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isBlocked ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <ImageIcon size={20} />
          </button>

          {/* Message Text Input */}
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isBlocked || sending}
            placeholder={isBlocked ? 'Chat is blocked by administrator' : 'Type a message...'}
            style={{
              flex: 1,
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: '24px',
              padding: '10px 16px',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = '#16A34A')}
            onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isBlocked || sending || (!text.trim() && !selectedFile)}
            style={{
              background: isBlocked || (!text.trim() && !selectedFile) ? '#E5E7EB' : '#16A34A',
              color: isBlocked || (!text.trim() && !selectedFile) ? '#9CA3AF' : '#FFFFFF',
              border: 'none',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isBlocked || (!text.trim() && !selectedFile) ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: isBlocked || (!text.trim() && !selectedFile) ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </footer>

      {/* ─── Lightbox Modal for Photo Preview ─── */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={lightboxImg}
              alt="zoom"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
            <button
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute', top: -14, right: -14,
                background: '#fff', color: '#111',
                border: 'none', borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontWeight: 800,
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
