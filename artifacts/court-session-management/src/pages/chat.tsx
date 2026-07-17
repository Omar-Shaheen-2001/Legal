import { useState } from 'react';
import { useAnalyzeMessage, useCreateSession, getListSessionsQueryKey, getGetDashboardStatsQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const analyzeMutation = useAnalyzeMessage();
  const createMutation = useCreateSession();

  const handleAnalyze = () => {
    if (!message.trim()) {
      toast({
        title: 'تنبيه',
        description: 'يرجى إدخال نص الرسالة أولاً',
        variant: 'destructive',
      });
      return;
    }

    analyzeMutation.mutate(
      { data: { message } },
      {
        onSuccess: (data) => {
          setExtractedData(data);
          setFormData({
            caseNumber: data.case_number || '',
            plaintiff: data.plaintiff || '',
            defendant: data.defendant || '',
            court: data.court || '',
            courtCircuit: data.court_circuit || '',
            caseSubject: data.case_subject || '',
            sessionType: data.session_type || '',
            sessionDateHijri: data.session_date_hijri || '',
            sessionTime: data.session_time || '',
            notes: data.notes || '',
          });
          toast({
            title: 'تم التحليل بنجاح',
            description: 'تم استخراج البيانات. راجعها وعدّلها قبل الحفظ.',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'فشل التحليل',
            description: error?.message || 'تعذّر تحليل الرسالة، حاول مرة أخرى',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSave = () => {
    createMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({
            title: 'تم الحفظ',
            description: 'تم حفظ جلسة المحكمة بنجاح',
          });
          setMessage('');
          setExtractedData(null);
          setFormData({});
          setLocation('/sessions');
        },
        onError: (error: any) => {
          toast({
            title: 'فشل الحفظ',
            description: error?.message || 'تعذّر حفظ الجلسة',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleReset = () => {
    setMessage('');
    setExtractedData(null);
    setFormData({});
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">تحليل رسالة المحكمة</h1>
        <p className="text-muted-foreground mt-1">
          الصق نص رسالة الجلسة لاستخراج البيانات تلقائياً بالذكاء الاصطناعي
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>نص الرسالة</CardTitle>
          <CardDescription>
            الصق نص إشعار الجلسة الواردة من المحكمة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="الصق نص رسالة المحكمة هنا..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            disabled={analyzeMutation.isPending}
            className="text-base resize-none leading-relaxed"
            dir="auto"
            data-testid="textarea-message"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !message.trim()}
              className="gap-2"
              data-testid="button-analyze"
            >
              <Sparkles className="w-4 h-4" />
              {analyzeMutation.isPending ? 'جارٍ التحليل...' : 'تحليل بالذكاء الاصطناعي'}
            </Button>
            {extractedData && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="gap-2"
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة تعيين
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {extractedData && (
        <Alert className="border-green-500/60 bg-green-50 dark:bg-green-950/30 animate-in fade-in-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-300 font-medium">
            ✅ تم استخراج البيانات — راجع الحقول أدناه ثم اضغط <strong>"حفظ الجلسة في Google Sheets"</strong> لحفظها
          </AlertDescription>
        </Alert>
      )}

      {extractedData && (
        <Card className="border-primary/50 shadow-lg animate-in fade-in-50 slide-in-from-bottom-2">
          <CardHeader>
            <CardTitle>البيانات المستخرجة</CardTitle>
            <CardDescription>
              راجع الحقول وعدّلها إن لزم، ثم اضغط زر الحفظ في الأسفل
            </CardDescription>
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
                <Label htmlFor="court">المحكمة</Label>
                <Input
                  id="court"
                  value={formData.court || ''}
                  onChange={(e) => updateField('court', e.target.value)}
                  data-testid="input-court"
                />
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
                rows={3}
                dir="auto"
                data-testid="textarea-notes"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending}
              size="lg"
              className="w-full gap-2 text-base font-bold h-14"
              data-testid="button-save"
            >
              <Save className="w-5 h-5" />
              {createMutation.isPending ? 'جارٍ الحفظ في Google Sheets...' : '⬆️ حفظ الجلسة في Google Sheets'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
