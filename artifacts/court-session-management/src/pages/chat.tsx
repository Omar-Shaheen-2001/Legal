import { useState } from 'react';
import { useAnalyzeMessage, useCreateSession, getListSessionsQueryKey, getGetDashboardStatsQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, RotateCcw } from 'lucide-react';
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
        title: 'Error',
        description: 'Please enter a message to analyze',
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
            title: 'Analysis Complete',
            description: 'Fields extracted successfully. Review and save below.',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Analysis Failed',
            description: error?.message || 'Failed to analyze message',
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
            title: 'Session Saved',
            description: 'Court session has been saved successfully',
          });
          setMessage('');
          setExtractedData(null);
          setFormData({});
          setLocation('/sessions');
        },
        onError: (error: any) => {
          toast({
            title: 'Save Failed',
            description: error?.message || 'Failed to save session',
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
        <h1 className="text-3xl font-bold tracking-tight">Analyze Court Message</h1>
        <p className="text-muted-foreground mt-1">
          Paste a court SMS message to extract session details automatically
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMS Message</CardTitle>
          <CardDescription>
            Paste the raw court hearing notification text below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste court SMS message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            disabled={analyzeMutation.isPending}
            className="font-mono text-sm resize-none"
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
              {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
            {extractedData && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="gap-2"
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {extractedData && (
        <Card className="border-primary/50 shadow-lg animate-in fade-in-50 slide-in-from-bottom-2">
          <CardHeader>
            <CardTitle>Extracted Information</CardTitle>
            <CardDescription>
              Review and edit the extracted fields before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="caseNumber">Case Number</Label>
                <Input
                  id="caseNumber"
                  value={formData.caseNumber || ''}
                  onChange={(e) => updateField('caseNumber', e.target.value)}
                  className="font-mono"
                  data-testid="input-caseNumber"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="court">Court</Label>
                <Input
                  id="court"
                  value={formData.court || ''}
                  onChange={(e) => updateField('court', e.target.value)}
                  className="rtl-text"
                  data-testid="input-court"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plaintiff">Plaintiff</Label>
                <Input
                  id="plaintiff"
                  value={formData.plaintiff || ''}
                  onChange={(e) => updateField('plaintiff', e.target.value)}
                  className="rtl-text"
                  data-testid="input-plaintiff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defendant">Defendant</Label>
                <Input
                  id="defendant"
                  value={formData.defendant || ''}
                  onChange={(e) => updateField('defendant', e.target.value)}
                  className="rtl-text"
                  data-testid="input-defendant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courtCircuit">Court Circuit</Label>
                <Input
                  id="courtCircuit"
                  value={formData.courtCircuit || ''}
                  onChange={(e) => updateField('courtCircuit', e.target.value)}
                  className="rtl-text"
                  data-testid="input-courtCircuit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseSubject">Case Subject</Label>
                <Input
                  id="caseSubject"
                  value={formData.caseSubject || ''}
                  onChange={(e) => updateField('caseSubject', e.target.value)}
                  className="rtl-text"
                  data-testid="input-caseSubject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type</Label>
                <Input
                  id="sessionType"
                  value={formData.sessionType || ''}
                  onChange={(e) => updateField('sessionType', e.target.value)}
                  className="rtl-text"
                  data-testid="input-sessionType"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionDateHijri">Session Date (Hijri)</Label>
                <Input
                  id="sessionDateHijri"
                  value={formData.sessionDateHijri || ''}
                  onChange={(e) => updateField('sessionDateHijri', e.target.value)}
                  className="font-mono"
                  data-testid="input-sessionDateHijri"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTime">Session Time</Label>
                <Input
                  id="sessionTime"
                  value={formData.sessionTime || ''}
                  onChange={(e) => updateField('sessionTime', e.target.value)}
                  className="font-mono"
                  data-testid="input-sessionTime"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                className="rtl-text"
                data-testid="textarea-notes"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="w-full gap-2"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending ? 'Saving...' : 'Save Session'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
