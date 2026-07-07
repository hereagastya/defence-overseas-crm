import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users2,
  GraduationCap,
  CheckSquare2,
  CalendarClock,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@doc/shared';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users2, label: 'Leads' },
  { to: '/students', icon: GraduationCap, label: 'Students' },
  { to: '/tasks', icon: CheckSquare2, label: 'Tasks' },
  { to: '/follow-ups', icon: CalendarClock, label: 'Follow-ups' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/employees', icon: Building2, label: 'Employees', adminOnly: true },
];

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex-1 space-y-0.5 px-2 py-2">
      {visibleItems.map((item) => (
        <Tooltip key={item.to} delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    : 'text-muted-foreground',
                  collapsed && 'justify-center px-2',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          )}
        </Tooltip>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-card transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b px-4',
          sidebarCollapsed && 'justify-center px-2',
        )}
      >
        {sidebarCollapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">DO</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">DO</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Defence Overseas</p>
              <p className="text-xs text-muted-foreground">CRM</p>
            </div>
          </div>
        )}
      </div>

      <SidebarNav collapsed={sidebarCollapsed} />

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn('w-full', sidebarCollapsed ? 'justify-center px-2' : 'justify-end')}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <span className="mr-1 text-xs text-muted-foreground">Collapse</span>
              <ChevronLeft className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
