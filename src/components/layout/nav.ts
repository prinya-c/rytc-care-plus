import type { UserRole } from '../../types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'แดชบอร์ด', icon: 'home' },
  {
    to: '/my-classes',
    label: 'กลุ่มเรียนของฉัน',
    icon: 'building',
    roles: ['advisor_teacher'],
  },
  {
    to: '/students',
    label: 'รายชื่อผู้เรียน',
    icon: 'users',
    roles: ['admin', 'advisor_teacher', 'advisor_staff'],
  },
  {
    to: '/screenings',
    label: 'คัดกรองผู้เรียน',
    icon: 'clipboard',
    roles: ['admin', 'advisor_teacher'],
  },
  {
    to: '/screenings/summary',
    label: 'สรุปคัดกรอง',
    icon: 'chart',
    roles: ['admin', 'advisor_teacher', 'advisor_staff'],
  },
  {
    to: '/home-visits/summary',
    label: 'สรุปเยี่ยมบ้าน',
    icon: 'map',
    roles: ['admin', 'advisor_teacher', 'advisor_staff'],
  },
  {
    to: '/referrals',
    label: 'ส่งต่อผู้เรียน',
    icon: 'send',
    roles: ['admin', 'advisor_teacher', 'advisor_staff'],
  },
  {
    to: '/referral-inbox',
    label: 'กล่องรับเรื่อง',
    icon: 'inbox',
    roles: ['admin', 'guidance_staff', 'scholarship_staff', 'rehabilitation_staff'],
  },
  { to: '/reports', label: 'รายงาน', icon: 'chart', roles: ['admin', 'advisor_staff'] },
  { to: '/users', label: 'จัดการผู้ใช้งาน', icon: 'cog', roles: ['admin', 'advisor_staff'] },
];

export function navItemsForRole(role?: UserRole) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

// Subset shown in the mobile bottom navigation (max 5 for usability)
export function bottomNavItemsForRole(role?: UserRole) {
  const all = navItemsForRole(role);
  return all.slice(0, 5);
}
