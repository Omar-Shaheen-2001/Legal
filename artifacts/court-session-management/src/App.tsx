import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';
import NotFound from '@/pages/not-found';
import LoginPage from '@/pages/login';
import DashboardPage from '@/pages/dashboard';
import ChatPage from '@/pages/chat';
import SessionsPage from '@/pages/sessions';
import SessionDetailPage from '@/pages/session-detail';
import SettingsPage from '@/pages/settings';
import ReportsPage from '@/pages/reports';
import SessionReportPage from '@/pages/session-report';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden flex-row-reverse">
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <AuthGuard>
          <AppShell>
            <DashboardPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route path="/chat">
        <AuthGuard>
          <AppShell>
            <ChatPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route path="/sessions">
        <AuthGuard>
          <AppShell>
            <SessionsPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route path="/sessions/:id">
        <AuthGuard>
          <AppShell>
            <SessionDetailPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard>
          <AppShell>
            <SettingsPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route path="/reports">
        <AuthGuard>
          <AppShell>
            <ReportsPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route path="/reports/:id">
        <AuthGuard>
          <AppShell>
            <SessionReportPage />
          </AppShell>
        </AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
