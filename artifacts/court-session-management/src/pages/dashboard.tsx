import { useGetDashboardStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, CheckCircle2, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';

const stats = [
  {
    key: 'totalCases',
    label: 'إجمالي القضايا',
    icon: Briefcase,
    gradient: 'from-blue-500/15 to-blue-600/5',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'todayHearings',
    label: 'جلسات اليوم',
    icon: Calendar,
    gradient: 'from-amber-500/15 to-amber-600/5',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  {
    key: 'upcomingHearings',
    label: 'جلسات قادمة',
    icon: Clock,
    gradient: 'from-emerald-500/15 to-emerald-600/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
  },
  {
    key: 'finishedHearings',
    label: 'جلسات منتهية',
    icon: CheckCircle2,
    gradient: 'from-purple-500/15 to-purple-600/5',
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-500',
    borderColor: 'border-purple-500/20',
    dotColor: 'bg-purple-500',
  },
] as const;

export default function DashboardPage() {
  const { data, isLoading, error } = useGetDashboardStats();

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">فشل تحميل إحصائيات لوحة التحكم</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="fade-in-up">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-3">نظرة عامة على نشاط جلسات المحكمة</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const value = data?.[stat.key];

          return (
            <div
              key={stat.key}
              className={`fade-in-up fade-in-up-delay-${i + 1} rounded-xl border ${stat.borderColor} bg-gradient-to-br ${stat.gradient} p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div className={`w-2 h-2 rounded-full ${stat.dotColor} mt-1`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mb-1" />
              ) : (
                <div className="text-4xl font-bold font-mono tracking-tight" data-testid={`stat-${stat.key}`}>
                  {value ?? 0}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="fade-in-up fade-in-up-delay-4 grid gap-4 sm:grid-cols-2">
        <Link href="/chat">
          <div
            className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 to-primary/3 p-6 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
            data-testid="link-analyze-message"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-base mb-1">تحليل رسالة جديدة</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  استخراج تفاصيل الجلسة من الرسالة النصية بالذكاء الاصطناعي
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-4 h-4 text-primary" />
            </div>
          </div>
        </Link>

        <Link href="/sessions">
          <div
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
            data-testid="link-view-sessions"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Calendar className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-base mb-1">عرض جميع الجلسات</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  تصفّح وإدارة جلسات الاستماع المسجّلة
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
