import { useState } from 'react';
import { useListSessions } from '@workspace/api-client-react';
import type { SessionStatus } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Calendar, Filter } from 'lucide-react';
import { TimeRemainingBadge } from '@/components/time-remaining';

const statusOptions: { value: SessionStatus | 'all'; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }[] = [
  { value: 'all', label: 'الكل', variant: 'outline' },
  { value: 'Today', label: 'اليوم', variant: 'default' },
  { value: 'Upcoming', label: 'قادمة', variant: 'secondary' },
  { value: 'Finished', label: 'منتهية', variant: 'outline' },
  { value: 'Cancelled', label: 'ملغية', variant: 'destructive' },
];

const statusLabelMap: Record<SessionStatus, string> = {
  Today: 'اليوم',
  Upcoming: 'قادمة',
  Finished: 'منتهية',
  Cancelled: 'ملغية',
};

const statusVariantMap: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Today: 'default',
  Upcoming: 'secondary',
  Finished: 'outline',
  Cancelled: 'destructive',
};

export default function SessionsPage() {
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');

  const { data: sessions, isLoading, error } = useListSessions(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">جلسات المحكمة</h1>
        <p className="text-muted-foreground mt-1">
          عرض وإدارة جميع جلسات الاستماع
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>تصفية حسب الحالة</CardTitle>
              <CardDescription>اختر حالة لتصفية الجلسات</CardDescription>
            </div>
            <Filter className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
                data-testid={`filter-${option.value}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">فشل تحميل الجلسات</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg font-mono" data-testid={`session-case-${session.id}`}>
                          {session.caseNumber || '—'}
                        </h3>
                        <Badge variant={statusVariantMap[session.status]} className="mt-1">
                          {statusLabelMap[session.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm">
                    {session.plaintiff && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">المدّعي:</span>
                        <span className="font-medium">{session.plaintiff}</span>
                      </div>
                    )}
                    {session.defendant && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">المدّعى عليه:</span>
                        <span className="font-medium">{session.defendant}</span>
                      </div>
                    )}
                    {session.court && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">المحكمة:</span>
                        <span className="font-medium">{session.court}</span>
                      </div>
                    )}
                    {session.sessionDateHijri && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">التاريخ:</span>
                        <span className="font-mono font-medium">{session.sessionDateHijri}</span>
                        {session.sessionTime && (
                          <span className="font-mono font-medium">— {session.sessionTime}</span>
                        )}
                      </div>
                    )}
                    <div>
                      <TimeRemainingBadge hearingAt={session.hearingAt} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد جلسات</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {statusFilter === 'all'
                ? 'لم يتم إضافة أي جلسات بعد'
                : `لا توجد جلسات بحالة "${statusLabelMap[statusFilter as SessionStatus] ?? statusFilter}"`}
            </p>
            <Link href="/chat">
              <Button data-testid="button-add-session">إضافة جلسة جديدة</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
