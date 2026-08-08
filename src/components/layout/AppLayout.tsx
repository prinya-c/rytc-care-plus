import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { navItemsForRole, bottomNavItemsForRole } from './nav';
import { Icon } from '../ui/Icon';
import { ROLE_LABEL } from '../../utils/rbac';

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || 'dev';

function formatBuildDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear() + 543}`;
}

const BUILD_DATE_LABEL = formatBuildDate(__BUILD_DATE__);

export default function AppLayout() {
  const { profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = navItemsForRole(profile?.role);
  const bottomItems = bottomNavItemsForRole(profile?.role);

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white print:hidden">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            C+
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">RYTC Care+</p>
            <p className="text-[11px] leading-tight text-gray-400">วิทยาลัยเทคนิคระยอง</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {profile?.displayName?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{profile?.displayName}</p>
              <p className="truncate text-xs text-gray-400">{profile ? ROLE_LABEL[profile.role] : ''}</p>
            </div>
            <button onClick={logout} title="ออกจากระบบ" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-center text-[10px] text-gray-300">
            v.{APP_VERSION} · {BUILD_DATE_LABEL}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              C+
            </div>
            <p className="text-sm font-bold text-gray-900">RYTC Care+</p>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <Icon name="menu" className="h-6 w-6" />
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 right-0 w-72 max-w-[85%] bg-white shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{profile?.displayName}</p>
                  <p className="text-xs text-gray-400">{profile ? ROLE_LABEL[profile.role] : ''}</p>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1 overflow-y-auto p-3">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon name={item.icon} className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                ))}
                <button
                  onClick={logout}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-close-600 hover:bg-close-50"
                >
                  <Icon name="logout" className="h-5 w-5" />
                  ออกจากระบบ
                </button>
                <p className="mt-1 text-center text-[10px] text-gray-300">
                  v.{APP_VERSION} · {BUILD_DATE_LABEL}
                </p>
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white lg:hidden print:hidden">
          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-brand-700' : 'text-gray-400'
                }`
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="truncate px-0.5">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
