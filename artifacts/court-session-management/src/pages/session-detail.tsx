import { useParams, useLocation } from 'wouter';
import { useGetSession, useUpdateSession, useDeleteSession, getListSessionsQueryKey, getGetDashboardStatsQueryKey, getGetSessionQueryKey } from '@workspace/api-client-react';
import type { SessionStatus } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ArrowRight, Save, Trash2 } from 'lucide-react';
import { TimeRemainingCard } from '@/components/time-remaining';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';

const statusLabelMap: Record<SessionStatus, string> = {
  Today: 'اليوم',
  Upcoming: 'قادمة',
  Finished: 'منتهية',
  Cancelled: 'ملغية',
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionId = Number(params.id);
  const { data: session, isLoading, error } = useGetSession(sessionId);

  const [formData, setFormData] = useState<any>({});
  const updateMutation = useUpdateSession();
  const deleteMutation = useDeleteSession();

  useEffect(() => {
    if (session) {
      setFormData({
        caseNumber: session.caseNumber || '',
        plaintiff: session.plaintiff || '',
        defendant: session.defendant || '',
        court: session.court || '',
        courtCircuit: session.courtCircuit || '',
        caseSubject: session.caseSubject || '',
        sessionType: session.sessionType || '',
        sessionDateHijri: session.sessionDateHijri || '',
        sessionTime: session.sessionTime || '',
        notes: session.notes || '',
        status: session.status,
      });
    }
  }, [session]);

  const updateField = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(
      { id: sessionId, data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({
            title: 'تم الحفظ',
            description: 'تم تحديث الجلسة بنجاح',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'فشل الحفظ',
            description: error?.message || 'تعذّر تحديث الجلسة',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: sessionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({
            title: 'تم الحذف',
            description: 'تم حذف الجلسة بنجاح',
          });
          setLocation('/sessions');
        },
        onError: (error: any) => {
          toast({
            title: 'فشل الحذف',
            description: error?.message || 'تعذّر حذف الجلسة',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (error) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => setLocation('/sessions')} className="mb-4 gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة إلى الجلسات
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">فشل تحميل تفاصيل الجلسة</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setLocation('/sessions')}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowRight className="w-4 h-4" />
          العودة إلى الجلسات
        </Button>
        <Badge
          variant={
            session.status === 'Today'
              ? 'default'
              : session.status === 'Upcoming'
              ? 'secondary'
              : session.status === 'Cancelled'
              ? 'destructive'
              : 'outline'
          }
        >
          {statusLabelMap[session.status]}
        </Badge>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono">
          {session.caseNumber || 'تفاصيل الجلسة'}
        </h1>
        <p className="text-muted-foreground mt-1">
          تاريخ الإنشاء: {new Date(session.createdAt).toLocaleDateString('ar-SA')}
        </p>
      </div>

      <TimeRemainingCard hearingAt={session.hearingAt} />

      <Card>
        <CardHeader>
          <CardTitle>بيانات الجلسة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="caseNumber">رقم القضية</Label>
              <Input
                id="caseNumber"
                value={formData.caseNumber || ''}
                onChange={(e) => updateField('caseNumber', e.target.value)}
                className="font-mono"
                dir="ltr"
                data-testid="input-caseNumber"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">قادمة</SelectItem>
                  <SelectItem value="Today">اليوم</SelectItem>
                  <SelectItem value="Finished">منتهية</SelectItem>
                  <SelectItem value="Cancelled">ملغية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plaintiff">المدّعي</Label>
              <Input
                id="plaintiff"
                value={formData.plaintiff || ''}
                onChange={(e) => updateField('plaintiff', e.target.value)}
                data-testid="input-plaintiff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defendant">المدّعى عليه</Label>
              <Input
                id="defendant"
                value={formData.defendant || ''}
                onChange={(e) => updateField('defendant', e.target.value)}
                data-testid="input-defendant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="court">المحكمة</Label>
              <Input
                id="court"
                value={formData.court || ''}
                onChange={(e) => updateField('court', e.target.value)}
                data-testid="input-court"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courtCircuit">الدائرة القضائية</Label>
              <Input
                id="courtCircuit"
                value={formData.courtCircuit || ''}
                onChange={(e) => updateField('courtCircuit', e.target.value)}
                data-testid="input-courtCircuit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caseSubject">موضوع القضية</Label>
              <Input
                id="caseSubject"
                value={formData.caseSubject || ''}
                onChange={(e) => updateField('caseSubject', e.target.value)}
                data-testid="input-caseSubject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionType">نوع الجلسة</Label>
              <Input
                id="sessionType"
                value={formData.sessionType || ''}
                onChange={(e) => updateField('sessionType', e.target.value)}
                data-testid="input-sessionType"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionDateHijri">تاريخ الجلسة (هجري)</Label>
              <Input
                id="sessionDateHijri"
                value={formData.sessionDateHijri || ''}
                onChange={(e) => updateField('sessionDateHijri', e.target.value)}
                className="font-mono"
                dir="ltr"
                data-testid="input-sessionDateHijri"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTime">وقت الجلسة</Label>
              <Input
                id="sessionTime"
                value={formData.sessionTime || ''}
                onChange={(e) => updateField('sessionTime', e.target.value)}
                className="font-mono"
                dir="auto"
                data-testid="input-sessionTime"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
              dir="auto"
              data-testid="textarea-notes"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex-1 gap-2"
          data-testid="button-save"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              className="gap-2"
              data-testid="button-delete"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الجلسة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
