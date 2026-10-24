export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('miraclbet_user');
    if (!raw) return {};
    const u = JSON.parse(raw);
    return {
      'X-Admin-Role': u.role || 'ADMIN',
      'X-Admin-ID': u.id || '',
    };
  } catch {
    return {};
  }
}

export function getAdminRoleQuery(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('miraclbet_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return `&admin_role=${encodeURIComponent(u.role || 'ADMIN')}&admin_id=${encodeURIComponent(u.id || '')}`;
  } catch {
    return '';
  }
}

export function isCurrentSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('miraclbet_user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    return u.role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}
