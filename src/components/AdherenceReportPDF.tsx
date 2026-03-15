import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdherenceReportPDFProps {
  className?: string;
}

export function AdherenceReportPDF({ className }: AdherenceReportPDFProps) {
  const [generating, setGenerating] = useState(false);

  const generateReport = useCallback(async () => {
    setGenerating(true);
    toast.info('Generating PDF report...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, date_of_birth, allergies, conditions')
        .eq('user_id', user.id)
        .single();

      // Fetch medications
      const { data: medications } = await supabase
        .from('medications')
        .select('name, strength, form, instructions, prescriber')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Fetch dose logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: doseLogs } = await supabase
        .from('dose_logs')
        .select('status, scheduled_for, action_at, medication_id, medications(name)')
        .eq('user_id', user.id)
        .gte('scheduled_for', thirtyDaysAgo.toISOString())
        .order('scheduled_for', { ascending: true });

      // Fetch adherence streak
      const { data: streak } = await supabase
        .from('adherence_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFillColor(37, 99, 235); // primary blue
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Med Guard Rx', margin, 18);
      doc.setFontSize(14);
      doc.text('Medication Adherence Report', margin, 30);

      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, 18, { align: 'right' });

      y = 50;
      doc.setTextColor(0, 0, 0);

      // Patient info
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Information', margin, y);
      y += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${profile?.name || 'N/A'}`, margin, y); y += 6;
      doc.text(`Date of Birth: ${profile?.date_of_birth || 'N/A'}`, margin, y); y += 6;
      doc.text(`Allergies: ${profile?.allergies?.join(', ') || 'None reported'}`, margin, y); y += 6;
      doc.text(`Conditions: ${profile?.conditions?.join(', ') || 'None reported'}`, margin, y); y += 6;
      doc.text(`Report Period: Last 30 days`, margin, y); y += 12;

      // Summary stats
      const totalDoses = doseLogs?.length || 0;
      const taken = doseLogs?.filter(l => l.status === 'taken').length || 0;
      const missed = doseLogs?.filter(l => l.status === 'missed').length || 0;
      const skipped = doseLogs?.filter(l => l.status === 'skipped').length || 0;
      const adherenceRate = totalDoses > 0 ? Math.round((taken / totalDoses) * 100) : 0;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Adherence Summary', margin, y); y += 8;

      // Summary table
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Scheduled Doses', String(totalDoses)],
          ['Doses Taken', `${taken} (${adherenceRate}%)`],
          ['Doses Missed', String(missed)],
          ['Doses Skipped', String(skipped)],
          ['Current Streak', `${streak?.current_streak || 0} days`],
          ['Longest Streak', `${streak?.longest_streak || 0} days`],
          ['Weekly Adherence', `${streak?.weekly_adherence || 0}%`],
          ['Monthly Adherence', `${streak?.monthly_adherence || 0}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Medications list
      if (medications && medications.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Active Medications', margin, y); y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Medication', 'Strength', 'Form', 'Prescriber']],
          body: medications.map(m => [
            m.name,
            m.strength,
            m.form,
            m.prescriber || 'N/A',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Daily breakdown (last 7 days)
      if (doseLogs && doseLogs.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Breakdown (Last 7 Days)', margin, y); y += 8;

        const dayMap = new Map<string, { taken: number; missed: number; skipped: number; total: number }>();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        doseLogs
          .filter(l => new Date(l.scheduled_for) >= sevenDaysAgo)
          .forEach(l => {
            const day = new Date(l.scheduled_for).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const entry = dayMap.get(day) || { taken: 0, missed: 0, skipped: 0, total: 0 };
            entry.total++;
            if (l.status === 'taken') entry.taken++;
            if (l.status === 'missed') entry.missed++;
            if (l.status === 'skipped') entry.skipped++;
            dayMap.set(day, entry);
          });

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Taken', 'Missed', 'Skipped', 'Adherence']],
          body: Array.from(dayMap.entries()).map(([day, e]) => [
            day,
            String(e.taken),
            String(e.missed),
            String(e.skipped),
            `${e.total > 0 ? Math.round((e.taken / e.total) * 100) : 0}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
          margin: { left: margin, right: margin },
        });
      }

      // Footer/disclaimer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          'This report is generated by Med Guard Rx for informational purposes only. It does not constitute medical advice.',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }

      // Save
      const fileName = `MedGuardRx_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('Report downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={generateReport}
      disabled={generating}
      className={className}
    >
      {generating ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        <FileText className="w-5 h-5 mr-2" />
      )}
      {generating ? 'Generating...' : 'Export PDF Report'}
    </Button>
  );
}
