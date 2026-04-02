import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FollowUpFlag {
  flag: string;
  urgency: 'high' | 'medium' | 'low';
  detail: string;
}

interface MedicationMention {
  name: string;
  context: string;
  action: 'continue' | 'new' | 'stop' | 'adjust' | 'discussed';
}

interface AppointmentData {
  title: string;
  doctor_name: string | null;
  appointment_date: string | null;
  plain_summary: string | null;
  follow_up_flags: FollowUpFlag[];
  medication_mentions: MedicationMention[];
  raw_transcript: string | null;
}

interface AppointmentSummaryPDFProps {
  appointment: AppointmentData;
}

const urgencyLabels: Record<string, string> = {
  high: 'HIGH PRIORITY',
  medium: 'MEDIUM',
  low: 'LOW',
};

const actionLabels: Record<string, string> = {
  continue: 'Continue',
  new: 'New Rx',
  stop: 'Discontinue',
  adjust: 'Adjust',
  discussed: 'Discussed',
};

export function AppointmentSummaryPDF({ appointment }: AppointmentSummaryPDFProps) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    toast.info('Generating PDF...');

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Appointment Summary', 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.title, 14, 26);
      if (appointment.doctor_name) {
        doc.text(`Dr. ${appointment.doctor_name.replace(/^Dr\.?\s*/i, '')}`, 14, 33);
      }

      // Date on right
      if (appointment.appointment_date) {
        const dateStr = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        doc.setFontSize(9);
        doc.text(dateStr, pageWidth - 14, 33, { align: 'right' });
      }

      y = 50;
      doc.setTextColor(0, 0, 0);

      // Plain Summary
      if (appointment.plain_summary) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Plain English Summary', 14, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // Strip markdown formatting for PDF
        const cleanSummary = appointment.plain_summary
          .replace(/[#*_~`]/g, '')
          .replace(/\n{3,}/g, '\n\n');
        const lines = doc.splitTextToSize(cleanSummary, pageWidth - 28);
        for (const line of lines) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 14, y);
          y += 5;
        }
        y += 8;
      }

      // Follow-Up Flags
      if (appointment.follow_up_flags.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Follow-Up Actions', 14, y);
        y += 3;

        const flagData = appointment.follow_up_flags
          .sort((a, b) => {
            const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
            return (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2);
          })
          .map(f => [
            urgencyLabels[f.urgency] || 'LOW',
            f.flag,
            f.detail,
          ]);

        autoTable(doc, {
          startY: y,
          head: [['Priority', 'Action Item', 'Details']],
          body: flagData,
          margin: { left: 14, right: 14 },
          headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 55 },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const val = data.cell.raw as string;
              if (val === 'HIGH PRIORITY') {
                data.cell.styles.textColor = [220, 38, 38];
              } else if (val === 'MEDIUM') {
                data.cell.styles.textColor = [202, 138, 4];
              }
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Medication Mentions
      if (appointment.medication_mentions.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Medications Discussed', 14, y);
        y += 3;

        const medData = appointment.medication_mentions.map(m => [
          m.name,
          actionLabels[m.action] || 'Discussed',
          m.context,
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Medication', 'Action', 'Context']],
          body: medData,
          margin: { left: 14, right: 14 },
          headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 30 },
          },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated by PillPal • Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Try native share first, fall back to download
      const pdfBlob = doc.output('blob');
      const fileName = `appointment-${appointment.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;

      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const shareData = { files: [file], title: 'Appointment Summary' };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success('Shared successfully!');
          setGenerating(false);
          return;
        }
      }

      // Fallback: download
      doc.save(fileName);
      toast.success('PDF downloaded!');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('PDF generation error:', err);
        toast.error('Failed to generate PDF');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={generating}
      className="gap-2"
    >
      {generating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      {generating ? 'Generating...' : 'Share PDF'}
    </Button>
  );
}
