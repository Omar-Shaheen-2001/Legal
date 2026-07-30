import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'wouter';
import {
  useGetSession,
  useGetSessionReport,
} from '@workspace/api-client-react';
import type { SessionReportInput } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Printer, Download, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const PRINT_STYLE = `
@media print {
  body { background-color: white !important; color: black !important; }
  body > * { display: none !important; }
  #report-print-area {
    display: block !important; position: absolute; top: 0; left: 0;
    width: 100%; margin: 0; padding: 0;
    border: none !important; box-shadow: none !important; background: white !important;
  }
  .print-hidden { display: none !important; }
}
`;

// Exact hex colors matching our theme
const C = {
  green: '#0c4a34',
  gold: '#c59b27',
  white: '#ffffff',
  slateLabel: '#f8fafc',
  slateLabelText: '#334155',
  bodyText: '#1e293b',
  border: '#c59b27',
  lightBorder: '#e2e8f0',
  dimText: '#94a3b8',
};

// Table cell styles
const th: React.CSSProperties = {
  backgroundColor: C.slateLabel,
  color: C.slateLabelText,
  fontWeight: '700',
  textAlign: 'center',
  fontSize: '11px',
  padding: '8px 10px',
  border: `1px solid ${C.gold}`,
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  color: C.bodyText,
  textAlign: 'center',
  fontSize: '11px',
  padding: '8px 10px',
  border: `1px solid ${C.gold}`,
};

const emptyForm = (): SessionReportInput => ({
  reportNumber: '01',
  lawyerName: '',
  summary: '',
  courtDecision: '',
  nextSessionDate: '',
  nextSessionTime: '',
  ourActionRequired: 'لا يوجد.',
  clientActionRequired: 'لا يوجد.',
  reportDate: new Date().toISOString().split('T')[0],
});

export default function SessionReportPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: sessionLoading } = useGetSession(id);
  const { data: existingReport, isLoading: reportLoading } = useGetSessionReport(id);

  const [form, setForm] = useState<SessionReportInput>(emptyForm());
  const [downloaded, setDownloaded] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    const localKey = `session_report_draft_${id}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      try { setForm(JSON.parse(savedLocal)); return; } catch (e) {}
    }
    if (existingReport) {
      setForm({
        reportNumber: existingReport.reportNumber || '01',
        lawyerName: existingReport.lawyerName || '',
        summary: existingReport.summary || '',
        courtDecision: existingReport.courtDecision || '',
        nextSessionDate: existingReport.nextSessionDate || '',
        nextSessionTime: existingReport.nextSessionTime || '',
        ourActionRequired: existingReport.ourActionRequired || 'لا يوجد.',
        clientActionRequired: existingReport.clientActionRequired || 'لا يوجد.',
        reportDate: existingReport.reportDate || new Date().toISOString().split('T')[0],
      });
    }
  }, [existingReport, id]);

  const handleChange = (field: keyof SessionReportInput, value: string) => {
    setDownloaded(false);
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem(`session_report_draft_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDownloadPdf = async () => {
    localStorage.setItem(`session_report_draft_${id}`, JSON.stringify(form));
    setIsDownloadingPdf(true);
    setIsExportingPdf(true);
    toast({ title: 'جاري تنزيل التقرير', description: 'يتم الآن تحويل التقرير إلى ملف PDF...' });
    // Wait for React to re-render with static text nodes
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const element = document.getElementById('report-print-area');
      if (!element) throw new Error('تعذر العثور على نموذج التقرير');
      const pdfEngine = typeof html2pdf === 'function' ? html2pdf : (window as any).html2pdf;
      if (!pdfEngine) throw new Error('مكتبة PDF غير محملة');
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `تقرير_جلسة_${session?.caseNumber || id}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 794,
          onclone: (clonedDoc: Document) => {
            const printArea = clonedDoc.getElementById('report-print-area');
            if (printArea) {
              printArea.style.width = '794px';
              printArea.style.maxWidth = '794px';
              printArea.style.margin = '0';
              printArea.style.boxSizing = 'border-box';
              printArea.style.backgroundColor = '#ffffff';
              printArea.style.borderRadius = '0';
              printArea.style.boxShadow = 'none';
              printArea.style.border = 'none';
            }
            // Strip oklch so html2canvas does not crash
            clonedDoc.querySelectorAll('style').forEach((s) => {
              if (s.innerHTML) {
                s.innerHTML = s.innerHTML
                  .replace(/--[a-zA-Z0-9-]+\s*:\s*oklch\([^;]+\);?/gi, '')
                  .replace(/oklch\([^)]+\)/gi, '#64748b')
                  .replace(/color-mix\([^)]+\)/gi, '#64748b');
              }
            });
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await pdfEngine().set(opt).from(element).save();
      setDownloaded(true);
      toast({ title: 'تم التحميل بنجاح', description: 'تم تنزيل ملف التقرير بصيغة PDF.' });
    } catch (err: any) {
      console.error('PDF error:', err);
      toast({ title: 'خطأ في إنشاء PDF', description: err?.message || 'تعذر تنزيل الملف.', variant: 'destructive' });
    } finally {
      setIsExportingPdf(false);
      setIsDownloadingPdf(false);
    }
  };

  const handleBrowserPrint = async () => {
    localStorage.setItem(`session_report_draft_${id}`, JSON.stringify(form));
    setIsExportingPdf(true);
    await new Promise((r) => setTimeout(r, 100));
    window.print();
    setTimeout(() => setIsExportingPdf(false), 800);
  };

  const getGregorianDate = () => {
    if (!session?.hearingAt) return '—';
    return session.hearingAt.split('T')[0];
  };

  const getArabicDay = () => {
    if (!session?.hearingAt) return '—';
    try {
      const date = new Date(session.hearingAt);
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return days[date.getDay()];
    } catch { return '—'; }
  };

  const getNextSessionDay = () => {
    if (!form.nextSessionDate) return '—';
    try {
      const date = new Date(form.nextSessionDate);
      if (isNaN(date.getTime())) return '—';
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return days[date.getDay()];
    } catch { return '—'; }
  };

  if (sessionLoading || reportLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-5">
          <p className="text-destructive font-medium">الجلسة غير موجودة.</p>
        </div>
      </div>
    );
  }

  // Inline-editable field: shows input in edit mode, plain text in export mode
  const F = ({ field, className, style, placeholder }: {
    field: keyof SessionReportInput;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
  }) => {
    const val = (form[field] as string) ?? '';
    if (isExportingPdf) {
      return (
        <span style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...style }}>
          {val || ''}
        </span>
      );
    }
    return (
      <input type="text" value={val} onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder} className={className} style={style} />
    );
  };

  const TA = ({ field, rows, className, style, placeholder }: {
    field: keyof SessionReportInput;
    rows?: number;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
  }) => {
    const val = (form[field] as string) ?? '';
    if (isExportingPdf) {
      return (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: (rows ?? 2) * 20, ...style }}>
          {val || ''}
        </div>
      );
    }
    return (
      <textarea rows={rows} value={val} onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder} className={className} style={style} />
    );
  };

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">

        {/* Actions header */}
        <div className="print-hidden flex items-center justify-between gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4" />
              العودة للتقارير
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button size="sm" className="gap-2 bg-[#0c4a34] hover:bg-[#064e3b] text-white shadow-sm"
              onClick={handleDownloadPdf} disabled={isDownloadingPdf} data-testid="button-download-pdf">
              {isDownloadingPdf
                ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : downloaded
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <Download className="w-4 h-4" />}
              {isDownloadingPdf ? 'جاري التحميل...' : downloaded ? 'تم التحميل بنجاح' : 'تنزيل التقرير (PDF)'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleBrowserPrint}>
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
          </div>
        </div>

        {/* Info notice */}
        <div className="print-hidden p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
          💡 <strong>ملاحظة:</strong> يتم حفظ المسودة تلقائيًا، وعند الضغط على <strong>"تنزيل التقرير (PDF)"</strong> يتم تصدير التقرير مباشرة كملف PDF بنفس التنسيق.
        </div>

        {/* ═══════════════════════════════════════════════════════════
             PRINTABLE REPORT AREA — all layout uses HTML tables
             so html2canvas renders it perfectly pixel-by-pixel
            ═══════════════════════════════════════════════════════════ */}
        <div
          id="report-print-area"
          ref={printRef}
          style={{
            direction: 'rtl',
            backgroundColor: C.white,
            color: C.bodyText,
            fontFamily: 'Arial, "Segoe UI", sans-serif',
            border: isExportingPdf ? 'none' : '1px solid #e2e8f0',
            borderRadius: isExportingPdf ? '0' : '12px',
            overflow: 'hidden',
            boxShadow: isExportingPdf ? 'none' : '0 10px 40px rgba(0,0,0,0.12)',
          }}
        >

          {/* ── Header ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `2px solid ${C.gold}` }}>
            <tbody>
              <tr>
                <td style={{ padding: '24px', verticalAlign: 'middle' }}>
                  <img src="/logo.png" alt="Mohammed Alay Logo" style={{ height: '120px', objectFit: 'contain' }} />
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '24px' }} />
                <td style={{ verticalAlign: 'middle', textAlign: 'left', padding: '0' }}>
                  <div style={{
                    backgroundColor: C.green, color: C.white,
                    padding: '20px 32px', borderBottomLeftRadius: '24px',
                    display: 'inline-block', minWidth: '200px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>تقرير الجلسة</div>
                    <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#cbd5e1', marginTop: '4px' }}>SESSION REPORT</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Body ── */}
          <div style={{ padding: '32px' }}>

            {/* Report Number */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{
                fontSize: '13px', fontWeight: '700', color: C.green,
                backgroundColor: '#f1f5f9', padding: '6px 20px',
                borderRadius: '999px', border: '1px solid #e2e8f0',
                display: 'inline-block',
              }}>
                تقرير رقم (
                {isExportingPdf
                  ? <span style={{ fontWeight: '700', color: C.green }}>{form.reportNumber ?? '01'}</span>
                  : <input type="text" value={form.reportNumber ?? '01'}
                      onChange={(e) => handleChange('reportNumber', e.target.value)}
                      style={{ width: '32px', background: 'transparent', textAlign: 'center', fontWeight: '700', color: C.green, border: 'none', outline: 'none', borderBottom: `1px solid transparent` }} />}
                )
              </span>
            </div>

            {/* ── Main Info Table ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={th}>اليوم</td>
                  <td style={td}>{getArabicDay()}</td>
                  <td style={th}>التاريخ</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{getGregorianDate()}</td>
                </tr>
                <tr>
                  <td style={th}>المحكمة</td>
                  <td style={td}>{session.court || '—'}</td>
                  <td style={th}>الدائرة</td>
                  <td style={td}>{session.courtCircuit || '—'}</td>
                </tr>
                <tr>
                  <td style={th}>المدعي</td>
                  <td style={td}>{session.plaintiff || '—'}</td>
                  <td style={th}>المدعى عليه</td>
                  <td style={td}>{session.defendant || '—'}</td>
                </tr>
                <tr>
                  <td style={th}>موضوع القضية</td>
                  <td style={td}>{session.caseSubject || '—'}</td>
                  <td style={th}>رقم القضية</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{session.caseNumber || '—'}</td>
                </tr>
              </tbody>
            </table>

            {/* ── Lawyer Assignment ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ ...th, width: '180px', borderRadius: '8px 0 0 8px' }}>
                    المحامي المسند إليه الجلسة
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    border: `1px solid ${C.lightBorder}`,
                    backgroundColor: C.white,
                    borderRadius: '0 8px 8px 0',
                  }}>
                    <F
                      field="lawyerName"
                      placeholder="ادخل اسم المحامي هنا..."
                      style={{ width: '100%', fontSize: '13px', color: C.bodyText, border: 'none', outline: 'none', background: 'transparent' }}
                      className="focus:outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── Summary Box ── */}
            <div style={{
              border: `1px solid ${C.gold}`,
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              <div style={{
                backgroundColor: C.green, color: C.white,
                textAlign: 'center', fontWeight: '700',
                fontSize: '13px', padding: '8px',
              }}>
                الملخص
              </div>
              <div style={{ padding: '16px' }}>
                <TA
                  field="summary"
                  rows={8}
                  placeholder="اكتب هنا ملخص ما دار في الجلسة بالتفصيل..."
                  style={{
                    width: '100%', fontSize: '13px', lineHeight: '1.8',
                    color: C.bodyText, minHeight: '180px',
                    border: isExportingPdf ? 'none' : `1px solid ${C.lightBorder}`,
                    borderRadius: '6px', padding: '12px', outline: 'none',
                    resize: 'vertical' as const, background: 'transparent',
                    boxSizing: 'border-box' as const,
                  }}
                />
                <div style={{ textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#475569', paddingLeft: '16px', marginTop: '8px' }}>
                  تفضلوا بقبول وافر الاحترام والتقدير،،،
                </div>
                <div style={{
                  textAlign: 'center', fontSize: '9px', color: C.dimText,
                  borderTop: `1px solid ${C.lightBorder}`, paddingTop: '12px',
                  marginTop: '12px', maxWidth: '480px', margin: '12px auto 0',
                  lineHeight: '1.6',
                }}>
                  عدم تقديمكم لأي اعتراض على هذه الإفادة إلى مكتب محمد العي للمحاماة خلال ثلاث أيام من وصولها لكم يعد موافقة منكم على مضمونها
                </div>
              </div>
            </div>

            {/* ── Next Session & Actions Table ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                {/* Next session row */}
                <tr>
                  <td style={{ ...th, width: '22%' }} rowSpan={1}>موعد الجلسة القادمة</td>
                  <td style={th}>التاريخ</td>
                  <td style={td}>
                    <F
                      field="nextSessionDate"
                      placeholder="YYYY-MM-DD"
                      style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', fontFamily: 'monospace', color: C.bodyText }}
                    />
                  </td>
                  <td style={th}>اليوم</td>
                  <td style={td}>
                    <span style={{ fontSize: '11px', color: C.bodyText }}>
                      {getNextSessionDay()}
                    </span>
                  </td>
                  <td style={th}>الساعة</td>
                  <td style={td}>
                    <F
                      field="nextSessionTime"
                      placeholder="00:00"
                      style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', color: C.bodyText }}
                    />
                  </td>
                </tr>
                {/* Our action row */}
                <tr>
                  <td style={{ ...th, width: '22%' }}>الإجراء المطلوب من قبلنا</td>
                  <td colSpan={6} style={{ ...td, textAlign: 'right', padding: '6px 10px' }}>
                    <TA
                      field="ourActionRequired"
                      rows={2}
                      placeholder="ادخل الإجراءات المطلوبة من فريق المحاماة..."
                      style={{
                        width: '100%', fontSize: '12px', color: C.bodyText, background: 'transparent',
                        border: isExportingPdf ? 'none' : `1px solid ${C.lightBorder}`,
                        borderRadius: '4px', padding: '4px 8px', outline: 'none', resize: 'none' as const,
                        boxSizing: 'border-box' as const, direction: 'rtl', textAlign: 'right',
                      }}
                    />
                  </td>
                </tr>
                {/* Client action row */}
                <tr>
                  <td style={{ ...th, width: '22%' }}>الإجراء المطلوب من قبلكم</td>
                  <td colSpan={6} style={{ ...td, textAlign: 'right', padding: '6px 10px' }}>
                    <TA
                      field="clientActionRequired"
                      rows={2}
                      placeholder="ادخل الإجراءات أو المستندات المطلوبة من العميل..."
                      style={{
                        width: '100%', fontSize: '12px', color: C.bodyText, background: 'transparent',
                        border: isExportingPdf ? 'none' : `1px solid ${C.lightBorder}`,
                        borderRadius: '4px', padding: '4px 8px', outline: 'none', resize: 'none' as const,
                        boxSizing: 'border-box' as const, direction: 'rtl', textAlign: 'right',
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>


          </div>

          {/* ── Footer Banner ── */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ height: '4px', backgroundColor: C.gold, width: '100%' }} />
            <table style={{ width: '100%', backgroundColor: C.green, borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', borderLeft: '1px solid rgba(255,255,255,0.2)', width: '30%' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: C.white }}>شريكك القانوني المعتمد</div>
                    <div style={{ fontSize: '9px', color: '#cbd5e1', letterSpacing: '1px', marginTop: '2px' }}>Your Trusted Legal Partner</div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', color: C.white, fontSize: '11px', flexWrap: 'wrap' }}>
                      <span>🌐 mohdalay.com</span>
                      <span>📞 053 678 7773</span>
                      <span>✉️ office@mahdalay.com</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', verticalAlign: 'middle', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.6', width: '25%' }}>
                    جدة، طريق الملك فهد 7746<br />
                    Jeddah, King Fahad Rd 7746
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
