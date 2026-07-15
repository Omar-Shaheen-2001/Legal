import { useGetDashboardStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const stats = [
  {
    key: 'totalCases',
    label: 'Total Cases',
    icon: Briefcase,
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
  },
  {
    key: 'todayHearings',
    label: "Today's Hearings",
    icon: Calendar,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
  },
  {
    key: 'upcomingHearings',
    label: 'Upcoming Hearings',
    icon: Clock,
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
  },
  {
    key: 'finishedHearings',
    label: 'Finished Hearings',
    icon: CheckCircle2,
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
  },
] as const;

export default function DashboardPage() {
  const { data, isLoading, error } = useGetDashboardStats();

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Failed to load dashboard statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of court session activities
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const value = data?.[stat.key];

          return (
            <Card key={stat.key} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`w-8 h-8 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold font-mono" data-testid={`stat-${stat.key}`}>
                    {value ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <a
            href="/chat"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
            data-testid="link-analyze-message"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Analyze New Message</div>
              <div className="text-sm text-muted-foreground">
                Extract hearing details from SMS
              </div>
            </div>
          </a>
          <a
            href="/sessions"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
            data-testid="link-view-sessions"
          >
            <div className="w-10 h-10 bg-accent/20 rounded-md flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Briefcase className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <div className="font-medium">View All Sessions</div>
              <div className="text-sm text-muted-foreground">
                Browse and manage hearings
              </div>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
