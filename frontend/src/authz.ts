import type { CurrentUser } from './api/core/AuthService';
import type { UserProfile } from './api/shared/ProfileAPI';

export const AppRoles = {
  Admin: 'Admin',
  CaseManager: 'CaseManager',
  DonationsManager: 'DonationsManager',
  OutreachManager: 'OutreachManager',
  User: 'User',
} as const;

export type AppRole = typeof AppRoles[keyof typeof AppRoles];

export type NavLink = {
  to: string;
  label: string;
  roles?: AppRole[];
  authRequired?: boolean;
};

const publicExactRoutes = new Set([
  '/',
  '/login',
  '/register',
  '/impact',
  '/privacy',
  '/terms',
  '/teapot',
  '/donate',
  '/donate/thank-you',
  '/resources',
]);

const exactMatches = (pathname: string, route: string) => pathname === route || pathname.startsWith(`${route}/`);
const rolePriority: AppRole[] = [
  AppRoles.Admin,
  AppRoles.CaseManager,
  AppRoles.DonationsManager,
  AppRoles.OutreachManager,
  AppRoles.User,
];

type RoleCarrier = Pick<UserProfile, 'role'> | Pick<CurrentUser, 'roles'>;

export function getCurrentRole(user: RoleCarrier | null | undefined): AppRole | null {
  if (!user) {
    return null;
  }

  const singleRole = (user as Pick<UserProfile, 'role'>).role;
  if (singleRole) {
    return singleRole as AppRole;
  }

  const roles = (user as Pick<CurrentUser, 'roles'>).roles;
  if (roles && roles.length > 0) {
    const firstKnownRole = rolePriority.find((candidate) => roles.includes(candidate));
    return firstKnownRole ?? null;
  }

  return null;
}

export function isPublicRoute(pathname: string) {
  return Array.from(publicExactRoutes).some((route) => exactMatches(pathname, route));
}

export function canAccessRoute(pathname: string, isAuthenticated: boolean, role: AppRole | null) {
  if (isPublicRoute(pathname)) {
    return true;
  }

  if (!isAuthenticated) {
    return false;
  }

  if (role === AppRoles.Admin) {
    return true;
  }

  if (exactMatches(pathname, '/profile') || exactMatches(pathname, '/donor-portal')) {
    return true;
  }

  if (role === AppRoles.User) {
    return false;
  }

  if (role === AppRoles.CaseManager && (exactMatches(pathname, '/admin') || exactMatches(pathname, '/cases') || exactMatches(pathname, '/safehouse-management'))) {
    return true;
  }

  if (role === AppRoles.DonationsManager && (exactMatches(pathname, '/admin') || exactMatches(pathname, '/donors') || exactMatches(pathname, '/donor-analytics'))) {
    return true;
  }

  if (role === AppRoles.OutreachManager && (exactMatches(pathname, '/admin') || exactMatches(pathname, '/outreach') || exactMatches(pathname, '/social-media'))) {
    return true;
  }

  return false;
}

export function canShowLink(link: NavLink, isAuthenticated: boolean, role: AppRole | null) {
  if (link.authRequired && !isAuthenticated) {
    return false;
  }

  if (!link.roles || link.roles.length === 0) {
    return true;
  }

  if (!isAuthenticated) {
    return false;
  }

  return role !== null && link.roles.includes(role);
}

export const headerLinks: NavLink[] = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact' },
  { to: '/donate', label: 'Donate' },
  { to: '/profile', label: 'My Donations', authRequired: true },
];

export const footerLinks: NavLink[] = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact' },
  { to: '/donate', label: 'Donate' },
  { to: '/profile', label: 'My Donations', authRequired: true },
  { to: '/admin', label: 'Dashboard', roles: [AppRoles.Admin, AppRoles.CaseManager, AppRoles.DonationsManager, AppRoles.OutreachManager] },
  { to: '/cases', label: 'Case Management', roles: [AppRoles.Admin, AppRoles.CaseManager] },
  { to: '/safehouse-management', label: 'Safehouse Management', roles: [AppRoles.Admin, AppRoles.CaseManager] },
  { to: '/donors', label: 'Donors', roles: [AppRoles.Admin, AppRoles.DonationsManager] },
  { to: '/outreach', label: 'Outreach', roles: [AppRoles.Admin, AppRoles.OutreachManager] },
  { to: '/social-media', label: 'Social Media', roles: [AppRoles.Admin, AppRoles.OutreachManager] },
  { to: '/login', label: 'Sign In', authRequired: false },
  { to: '/register', label: 'Create an Account', authRequired: false },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/resources', label: 'Resources' },
];