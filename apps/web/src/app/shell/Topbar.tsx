import { useState } from 'react';
import { Menu, Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore, type Theme } from '@/store/useUIStore';
import { Button } from '@/components/ui/button';
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
