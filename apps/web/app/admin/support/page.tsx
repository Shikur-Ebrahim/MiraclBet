'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Search, Send, Image as ImageIcon, X, ShieldAlert,
  ShieldCheck, Loader2, Check, CheckCheck, UserX, UserCheck,
  RefreshCw, MessageSquare
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type ConversationSummary = {
  user_id: string;
  user_phone: string;
  user_full_name: string;
  is_blocked: boolean;
  last_message: string;
  last_image_url?: string;
  last_sender_role: string;
  last_message_at: string;
  unread_count: number;
};

type SupportMessage = {
  id: string;
  user_id: string;
  sender_role: 'USER' | 'ADMIN';
  sender_id?: string;
  message: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
};

type ActiveUser = {
  id: string;
  phone: string;
  full_name: string;
  is_blocked: boolean;
};

export default function AdminSupportPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'blocked'>('all');

  // Input & Sending
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeUserIdRef = useRef<string | null>(null);

  activeUserIdRef.current = selectedUserId;

  // Verify Admin Auth
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miraclbet_user');
    if (!saved) {
      router.push('/login');
      return;
    }
    const u = JSON.parse(saved);
    if (u.role !== 'ADMIN' && !(u.role === 'WORKER' && (u.privileges || []).includes('support'))) {
      router.push('/');
      return;
    }
    setAdminUser(u);
  }, [router]);

  // Load conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/support/conversations`);
      if (!res.ok) return;
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  // Load specific conversation messages
  const fetchActiveConversation = async (userId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/support/conversations/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveUser(data.user || null);
      setMessages(data.messages || []);
    } catch (e) {
      console.error('Failed to load active conversation:', e);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Auto-polling effect: polls conversation list + current conversation
  useEffect(() => {
    if (!adminUser) return;

    fetchConversations(false);

    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeUserIdRef.current) {
        fetchActiveConversation(activeUserIdRef.current, true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [adminUser]);

  // Select a user to chat with
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    fetchActiveConversation(userId, false);
    // Mark unread as 0 locally in conversations
    setConversations(prev =>
      prev.map(c => (c.user_id === userId ? { ...c, unread_count: 0 } : c))
    );
  };

  // Auto-scroll on messages change
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Photo File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file exceeds the 10MB limit.');
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

  // Send Admin Reply
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId || sending || uploadingImage) return;

    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    setSending(true);
    let uploadedImageUrl = '';

    if (selectedFile) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const uploadRes = await fetch(`${API}/api/v1/support/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedImageUrl = uploadData.url || '';
        } else {
          alert('Failed to upload image. Please try again.');
          setSending(false);
          setUploadingImage(false);
          return;
        }
      } catch {
        alert('Image upload network error');
        setSending(false);
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    try {
      const res = await fetch(`${API}/api/v1/admin/support/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          admin_id: adminUser?.id || '',
          message: trimmed,
          image_url: uploadedImageUrl,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setText('');
        clearSelectedImage();
        fetchConversations(true);
      } else {
        alert('Failed to send message.');
      }
    } catch {
      alert('Network error sending message.');
    } finally {
      setSending(false);
    }
  };

  // Block / Unblock User
  const handleToggleBlock = async () => {
    if (!selectedUserId || !activeUser || actionLoading) return;

    const willBlock = !activeUser.is_blocked;
    const confirmMsg = willBlock
      ? `Are you sure you want to BLOCK user (${activeUser.phone || activeUser.id.slice(-6)}) from sending support messages?`
      : `Unblock user (${activeUser.phone || activeUser.id.slice(-6)}) so they can chat again?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/support/users/${selectedUserId}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: willBlock }),
      });

      if (res.ok) {
        setActiveUser(prev => prev ? { ...prev, is_blocked: willBlock } : null);
        setConversations(prev =>
          prev.map(c => (c.user_id === selectedUserId ? { ...c, is_blocked: willBlock } : c))
        );
      } else {
        alert('Failed to update user block status.');
      }
    } catch {
      alert('Network error updating block status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper formatting
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

  const resolveImgUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API}${url}`;
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const matchesSearch =
      c.user_phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === 'unread') return c.unread_count > 0;
    if (filterTab === 'blocked') return c.is_blocked;
    return true;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  if (!mounted || !adminUser) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF',
      color: '#111827',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: 9999,
      overflow: 'hidden',
    }}>

      {/* ─── Global Admin Navigation Bar (White Backed) ─── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{
              background: '#F3F4F6',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> Admin Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
                Support Chat Management
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                Direct live communication with customers
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalUnread > 0 && (
            <span style={{
              background: '#EF4444', color: '#fff', fontSize: '11px',
              fontWeight: 800, padding: '3px 10px', borderRadius: '14px',
            }}>
              {totalUnread} Unread
            </span>
          )}
          <button
            onClick={() => {
              fetchConversations(false);
              if (selectedUserId) fetchActiveConversation(selectedUserId, false);
            }}
            title="Refresh"
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#4B5563',
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ─── Main Content Pane (Responsive Layout) ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── LEFT: Conversations List Pane ─── */}
        <div
          style={{
            width: '100%',
            maxWidth: selectedUserId ? '360px' : '100%',
            borderRight: '1px solid #E5E7EB',
            flexDirection: 'column',
            background: '#FFFFFF',
          }}
          className={selectedUserId ? 'hidden md:flex' : 'flex'}
        >

          {/* Search Box */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: '10px', padding: '8px 12px',
            }}>
              <Search size={16} style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search phone or user ID..."
                style={{
                  border: 'none', background: 'transparent',
                  outline: 'none', fontSize: '13px', width: '100%', color: '#111827',
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {(['all', 'unread', 'blocked'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    border: 'none',
                    cursor: 'pointer',
                    background: filterTab === tab ? '#16A34A' : '#F3F4F6',
                    color: filterTab === tab ? '#FFFFFF' : '#4B5563',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab === 'unread' ? `Unread (${totalUnread})` : tab}
                </button>
              ))}
            </div>
          </div>

          {/* List of User Threads */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingConversations && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                <Loader2 size={22} className="animate-spin" />
              </div>
            )}

            {!loadingConversations && filteredConversations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 16px', color: '#9CA3AF' }}>
                <MessageSquare size={36} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>No conversations found</div>
                <div style={{ fontSize: '12px', marginTop: 4 }}>User support requests will appear here.</div>
              </div>
            )}

            {filteredConversations.map(conv => {
              const isSelected = selectedUserId === conv.user_id;
              const shortId = conv.user_id ? conv.user_id.slice(-6).toUpperCase() : '------';
              const displayPhone = conv.user_phone || `User #${shortId}`;

              return (
                <div
                  key={conv.user_id}
                  onClick={() => handleSelectUser(conv.user_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderBottom: '1px solid #F3F4F6',
                    cursor: 'pointer',
                    background: isSelected ? '#F0FDF4' : '#FFFFFF',
                    borderLeft: isSelected ? '4px solid #16A34A' : '4px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* User Avatar */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: conv.is_blocked ? '#FEE2E2' : '#DCFCE7',
                    color: conv.is_blocked ? '#DC2626' : '#15803D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '14px', flexShrink: 0,
                  }}>
                    {conv.is_blocked ? '🚫' : '👤'}
                  </div>

                  {/* Thread details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayPhone}
                      </div>
                      <span style={{ fontSize: '10px', color: '#9CA3AF', flexShrink: 0 }}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{
                        fontSize: '12px',
                        color: conv.unread_count > 0 ? '#111827' : '#6B7280',
                        fontWeight: conv.unread_count > 0 ? 700 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {conv.last_sender_role === 'ADMIN' && <span style={{ color: '#16A34A', fontWeight: 600 }}>You: </span>}
                        {conv.last_image_url && !conv.last_message ? '📷 Photo' : conv.last_message}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {conv.is_blocked && (
                          <span style={{ fontSize: '9px', fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '1px 6px', borderRadius: '8px' }}>
                            BLOCKED
                          </span>
                        )}
                        {conv.unread_count > 0 && (
                          <span style={{
                            background: '#16A34A', color: '#fff', fontSize: '10px',
                            fontWeight: 800, minWidth: '18px', height: '18px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', padding: '0 4px',
                          }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ─── RIGHT: Active Chat View Pane ─── */}
        <div
          style={{
            flex: 1,
            flexDirection: 'column',
            background: '#FFFFFF',
          }}
          className={selectedUserId ? 'flex' : 'hidden md:flex'}
        >

          {selectedUserId && activeUser ? (
            <>
              {/* Active Chat Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Back button for mobile view */}
                  <button
                    onClick={() => setSelectedUserId(null)}
                    style={{
                      background: '#F3F4F6', border: 'none', borderRadius: '8px',
                      padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px',
                      color: '#374151', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    }}
                    className="md:hidden"
                  >
                    <ArrowLeft size={16} /> All Chats
                  </button>

                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: activeUser.is_blocked ? '#FEE2E2' : '#DCFCE7',
                    color: activeUser.is_blocked ? '#DC2626' : '#15803D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '14px',
                  }}>
                    {activeUser.is_blocked ? '🚫' : '👤'}
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {activeUser.phone || 'User Chat'}
                      {activeUser.is_blocked && (
                        <span style={{ fontSize: '10px', fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: '8px' }}>
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      ID: {activeUser.id.slice(-6).toUpperCase()} {activeUser.full_name ? `• ${activeUser.full_name}` : ''}
                    </div>
                  </div>
                </div>

                {/* Block / Unblock Action Button */}
                <div>
                  <button
                    onClick={handleToggleBlock}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      background: activeUser.is_blocked ? '#DCFCE7' : '#FEE2E2',
                      color: activeUser.is_blocked ? '#15803D' : '#DC2626',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : activeUser.is_blocked ? (
                      <>
                        <UserCheck size={14} /> Unblock User
                      </>
                    ) : (
                      <>
                        <UserX size={14} /> Block User
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Blocked Status Notice */}
              {activeUser.is_blocked && (
                <div style={{
                  background: '#FEF2F2', borderBottom: '1px solid #FECACA',
                  padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '12px', color: '#DC2626', fontWeight: 600,
                }}>
                  <ShieldAlert size={16} />
                  <span>This user is currently blocked from sending messages or photos. You can still message them or click Unblock above.</span>
                </div>
              )}

              {/* Messages Body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#FAFAFA',
              }}>
                {loadingMessages && (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF' }}>
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '50px 0', color: '#9CA3AF' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>No messages yet with this user.</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Type a message below to start the support conversation.</div>
                  </div>
                )}

                {messages.map((m, idx) => {
                  const isAdmin = m.sender_role === 'ADMIN';
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
                        justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: '8px',
                      }}>
                        {/* User Avatar on incoming */}
                        {!isAdmin && (
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#E0F2FE', color: '#0369A1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 800, flexShrink: 0,
                          }}>
                            👤
                          </div>
                        )}

                        <div style={{
                          maxWidth: '75%',
                          background: isAdmin ? '#0284C7' : '#FFFFFF',
                          color: isAdmin ? '#FFFFFF' : '#111827',
                          borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          padding: m.image_url ? '6px 6px 8px 6px' : '10px 14px',
                          border: isAdmin ? 'none' : '1px solid #E5E7EB',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}>
                          {/* Image Attachment */}
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

                          {/* Message Text */}
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

                          {/* Meta Timestamp */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginTop: '4px',
                            fontSize: '10px',
                            color: isAdmin ? 'rgba(255,255,255,0.75)' : '#9CA3AF',
                          }}>
                            <span>{formatTime(m.created_at)}</span>
                            {isAdmin && (
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

                <div ref={chatEndRef} style={{ height: '6px' }} />
              </div>

              {/* Chat Reply Input Bar */}
              <div style={{
                flexShrink: 0,
                background: '#FFFFFF',
                borderTop: '1px solid #E5E7EB',
                padding: '10px 16px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              }}>
                {previewUrl && (
                  <div style={{
                    position: 'relative', display: 'inline-block',
                    marginBottom: '8px', border: '2px solid #0284C7',
                    borderRadius: '10px', overflow: 'hidden',
                  }}>
                    <img src={previewUrl} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', display: 'block' }} />
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'rgba(0,0,0,0.65)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: '18px', height: '18px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  {/* Photo upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Photo"
                    style={{
                      background: previewUrl ? '#E0F2FE' : '#F3F4F6',
                      color: previewUrl ? '#0284C7' : '#4B5563',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <ImageIcon size={18} />
                  </button>

                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type an official reply to customer..."
                    style={{
                      flex: 1,
                      background: '#F9FAFB',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: '24px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#0284C7')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                  />

                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !selectedFile)}
                    style={{
                      background: !text.trim() && !selectedFile ? '#E5E7EB' : '#0284C7',
                      color: !text.trim() && !selectedFile ? '#9CA3AF' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: !text.trim() && !selectedFile ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                      boxShadow: !text.trim() && !selectedFile ? 'none' : '0 2px 8px rgba(2,132,199,0.3)',
                    }}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', padding: '32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MessageSquare size={30} style={{ opacity: 0.4 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#374151', marginBottom: 6 }}>No Conversation Selected</div>
              <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.4 }}>
                Select a user thread from the list on the left to review messages and send replies.
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ─── Lightbox Modal ─── */}
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
