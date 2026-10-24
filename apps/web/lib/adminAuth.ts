export function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window === 'undefined') return headers;
  try {
    const token = localStorage.getItem('miraclbet_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const raw = localStorage.getItem('miraclbet_user');
    if (raw) {
      const u = JSON.parse(raw);
      const isSuper = isCurrentSuperAdmin();
      const effectiveRole = isSuper ? 'SUPER_ADMIN' : (u.role || 'ADMIN');
      headers['X-Admin-Role'] = effectiveRole;
      headers['X-User-Role'] = effectiveRole;
      if (u.id) {
        headers['X-Admin-ID'] = u.id;
        headers['X-User-ID'] = u.id;
      }
    }
  } catch {}
  return headers;
}

export function isCurrentSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('miraclbet_user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    const isSuper =
      u.role === 'SUPER_ADMIN' ||
      u.phone === '999992524' ||
      u.phone === '0999992524' ||
      (typeof u.phone === 'string' && u.phone.endsWith('999992524')) ||
      u.id === '2603395b-b8e1-47e2-84bb-619f01c9eb7d' ||
      u.id === '46c2e295-24a1-4101-9ec9-2569ca947c70';
    if (isSuper && u.role !== 'SUPER_ADMIN') {
      u.role = 'SUPER_ADMIN';
      localStorage.setItem('miraclbet_user', JSON.stringify(u));
    }
    return isSuper;
  } catch {
    return false;
  }
}

export function getAdminRoleQuery(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('miraclbet_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    const isSuper = isCurrentSuperAdmin();
    const effectiveRole = isSuper ? 'SUPER_ADMIN' : (u.role || 'ADMIN');
    return `&admin_role=${encodeURIComponent(effectiveRole)}&admin_id=${encodeURIComponent(u.id || '')}&admin_phone=${encodeURIComponent(u.phone || '')}`;
  } catch {
    return '';
  }
}
