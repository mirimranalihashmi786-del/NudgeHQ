'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard, Menu, Receipt, User, Users, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/bills', label: 'Bills', icon: Receipt },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="ui-root ui-shell flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-background text-foreground md:flex-row">
      <aside
        className={`ui-sidebar w-full shrink-0 flex-col gap-6 border-b border-border bg-card p-4 md:w-60 md:border-b-0 md:border-r ${
          menuOpen ? 'flex' : 'hidden'
        } md:flex`}
       data-nexen-id="nx-2bffa68a-0">
        <div className="ui-brand flex min-w-0 items-center gap-2">
          <img src="/nexen-logo.svg" alt="" className="h-7 w-7 shrink-0"  data-nexen-id="nx-2bffa68a-1"/>
          <span className="truncate text-base font-semibold" data-nexen-id="nx-2bffa68a-2">NudgeHQ</span>
        </div>

        <nav className="ui-nav flex flex-col gap-1" data-nexen-id="nx-2bffa68a-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex min-w-0 items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-primary font-medium text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                }`}
               data-nexen-id="nx-2bffa68a-4">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span data-nexen-component="nx_components_AppShell" className="truncate" data-nexen-id="nx-2bffa68a-5">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="ui-topbar flex min-w-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6" data-nexen-id="nx-2bffa68a-6">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-[var(--radius)] p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
           data-nexen-id="nx-2bffa68a-7">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="ui-user ml-auto flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="ui-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" data-nexen-id="nx-2bffa68a-8">
              <User className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </header>

        <main className="ui-content min-w-0 flex-1 overflow-x-hidden" data-nexen-id="nx-2bffa68a-9">{children}</main>
      </div>
    </div>
  );
}