import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useLogout } from '@/features/auth/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function roleBadge(role: string) {
  switch (role) {
    case 'admin':
      return 'destructive' as const;
    case 'counselor':
      return 'default' as const;
    default:
      return 'secondary' as const;
  }
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { mutate: logout, isPending } = useLogout();

  if (!user) return null;

  function handleLogout() {
    logout(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} />}
            <AvatarFallback className="text-xs">{initials(user.full_name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{user.full_name}</span>
              <Badge variant={roleBadge(user.role)} className="capitalize text-[10px]">
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
            <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isPending}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isPending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
