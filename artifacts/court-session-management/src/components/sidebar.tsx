import { Link, useLocation } from 'wouter';
import { LayoutDashboard, MessageSquare, Calendar, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from '@/components/ui/button';
import { useLogout } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Analyze Message', path: '/chat', icon: MessageSquare },
  { name: 'All Sessions', path: '/sessions', icon: Calendar },
];

export function Sidebar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        window.location.href = '/login';
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to log out',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground">
          Court Session Manager
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Legal Secretary Portal</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              data-testid={`nav-${item.path === '/' ? 'dashboard' : item.path.slice(1)}`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-full justify-start gap-3"
          data-testid="button-toggle-theme"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4" />
              Dark Mode
            </>
          ) : (
            <>
              <Sun className="w-4 h-4" />
              Light Mode
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full justify-start gap-3"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </div>
  );
}
