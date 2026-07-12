import { useEffect, useRef, useState } from 'react';
import { Menu, Sun, Moon, Monitor, Search, GraduationCap, Users2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type { PaginatedResponse, LeadWithCounselor, StudentWithCounselor } from '@doc/shared';
import { useUIStore, type Theme } from '@/store/useUIStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';
import { NotificationsDrawer } from './NotificationsDrawer';
import { SidebarNav } from './Sidebar';

// ── Theme toggle ───────────────────────────────────────────────────────────────

const THEMES: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

function ThemeToggle() {
  const { theme, setTheme } = useUIStore();
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map(({ value, icon: TIcon, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={theme === value ? 'font-medium text-foreground' : ''}
          >
            <TIcon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Global search ──────────────────────────────────────────────────────────────

function GlobalSearch() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const enabled = query.length >= 2;

  const leadsQuery = useQuery({
    queryKey: ['global-search', 'leads', query],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<LeadWithCounselor>>(API_ENDPOINTS.LEADS.LIST, {
          params: { search: query, limit: 5, page: 1 },
        })
        .then((r) => r.data.data.items),
    enabled,
    staleTime: 30_000,
  });

  const studentsQuery = useQuery({
    queryKey: ['global-search', 'students', query],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<StudentWithCounselor>>(API_ENDPOINTS.STUDENTS.LIST, {
          params: { search: query, limit: 5, page: 1 },
        })
        .then((r) => r.data.data.items),
    enabled,
    staleTime: 30_000,
  });

  const leads = leadsQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const hasResults = leads.length > 0 || students.length > 0;
  const showDropdown =
    expanded && enabled && (hasResults || leadsQuery.isLoading || studentsQuery.isLoading);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [expanded]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [expanded]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setExpanded(false);
    }
  }

  function navigateTo(path: string) {
    navigate(path);
    setExpanded(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {expanded ? (
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search leads, students…"
              className="h-8 w-64 pl-8 text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(false)}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setExpanded(true)} aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      )}

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover shadow-md">
          {(leadsQuery.isLoading || studentsQuery.isLoading) && !hasResults ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Searching…</div>
          ) : !hasResults ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {leads.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users2 className="h-3 w-3" />
                    Leads
                  </div>
                  {leads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                      onClick={() => navigateTo(`/leads/${lead.id}`)}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{lead.full_name}</span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {lead.email ?? lead.phone}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {students.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <GraduationCap className="h-3 w-3" />
                    Students
                  </div>
                  {students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                      onClick={() => navigateTo(`/students/${student.id}`)}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{student.full_name}</span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {student.email ?? student.phone}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────────

export function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <div className="flex-1 min-w-0">
          <Breadcrumbs />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <GlobalSearch />
          <ThemeToggle />
          <NotificationsDrawer />
          <UserMenu />
        </div>
      </header>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center border-b px-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">DO</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Defence Overseas</p>
                <p className="text-xs text-muted-foreground">CRM</p>
              </div>
            </div>
          </div>
          <SidebarNav collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
