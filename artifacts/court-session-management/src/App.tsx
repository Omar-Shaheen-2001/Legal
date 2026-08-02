import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const NotFound = React.lazy(() => import('@/pages/not-found'));
const LoginPage = React.lazy(() => import('@/pages/login'));
const DashboardPage = React.lazy(() => import('@/pages/dashboard'));
const ChatPage = React.lazy(() => import('@/pages/chat'));
const SessionsPage = React.lazy(() => import('@/pages/sessions'));
const SessionDetailPage = React.lazy(() => import('@/pages/session-detail'));
const SettingsPage = React.lazy(() => import('@/pages/settings'));
const ReportsPage = React.lazy(() => import('@/pages/reports'));
const SessionReportPage = React.lazy(() => import('@/pages/session-report'));

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
        <ErrorBoundary>
          <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <LoginPage />
        </Suspense>
      </Route>
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
      <Route>
        <Suspense fallback={<div />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
