import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle2, Circle, Pill, Calendar, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AppointmentSummaryPDF } from './AppointmentSummaryPDF';
import { useAppointments } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';

interface AppointmentSummaryProps {
  appointmentId: string;
  onBack: () => void;
}

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

const urgencyColors = {
  high: 'border-destructive/50 bg-destructive/10 text-destructive',
  medium: 'border-accent/50 bg-accent/10 text-accent-foreground',
  low: 'border-primary/50 bg-primary/10 text-primary',
};

const urgencyLabels = {
  high: '🔴 High Priority',
  medium: '🟡 Medium',
  low: '🟢 Low',
};

const actionLabels: Record<string, { label: string; color: string }> = {
  continue: { label: 'Continue', color: 'bg-primary/20 text-primary' },
  new: { label: 'New Rx', color: 'bg-accent/20 text-accent-foreground' },
  stop: { label: 'Discontinue', color: 'bg-destructive/20 text-destructive' },
  adjust: { label: 'Adjust', color: 'bg-secondary text-secondary-foreground' },
  discussed: { label: 'Discussed', color: 'bg-muted text-muted-foreground' },
};

export function AppointmentSummary({ appointmentId, onBack }: AppointmentSummaryProps) {
  const { appointments, deleteAppointment } = useAppointments();
  const [showTranscript, setShowTranscript] = useState(false);

  const appointment = appointments.find(a => a.id === appointmentId);

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Appointment not found</p>
      </div>
    );
  }

  const followUpFlags: FollowUpFlag[] = (appointment.follow_up_flags || []) as FollowUpFlag[];
  const medicationMentions: MedicationMention[] = (appointment.medication_mentions || []) as MedicationMention[];

  const handleDelete = async () => {
    await deleteAppointment(appointmentId);
    onBack();
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-elder-xl font-bold text-foreground truncate">{appointment.title}</h1>
          {appointment.doctor_name && (
            <p className="text-sm text-muted-foreground">Dr. {appointment.doctor_name.replace(/^Dr\.?\s*/i, '')}</p>
          )}
        </div>
        {appointment.status === 'completed' && (
          <AppointmentSummaryPDF
            appointment={{
              title: appointment.title,
              doctor_name: appointment.doctor_name,
              appointment_date: appointment.appointment_date,
              plain_summary: appointment.plain_summary,
              follow_up_flags: followUpFlags,
              medication_mentions: medicationMentions,
              raw_transcript: appointment.raw_transcript,
            }}
          />
        )}
        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">
            {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>

        {/* Plain Summary */}
        {appointment.plain_summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-elder-lg">📋 Plain English Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                <ReactMarkdown>{appointment.plain_summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Follow-Up Flags */}
        {followUpFlags.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-elder-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent" />
                Follow-Up Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {followUpFlags
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return (order[a.urgency] || 2) - (order[b.urgency] || 2);
                })
                .map((flag, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-4 rounded-xl border-2",
                      urgencyColors[flag.urgency] || urgencyColors.low
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase">
                        {urgencyLabels[flag.urgency] || urgencyLabels.low}
                      </span>
                    </div>
                    <p className="font-bold text-foreground">{flag.flag}</p>
                    <p className="text-sm text-muted-foreground mt-1">{flag.detail}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Medication Mentions */}
        {medicationMentions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-elder-lg flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary" />
                Medications Discussed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {medicationMentions.map((med, i) => {
                const actionInfo = actionLabels[med.action] || actionLabels.discussed;
                return (
                  <div key={i} className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">{med.name}</span>
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-full", actionInfo.color)}>
                        {actionInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{med.context}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Raw Transcript Toggle */}
        {appointment.raw_transcript && (
          <Card>
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-elder-lg">🎙️ Full Transcript</CardTitle>
                {showTranscript ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </CardHeader>
            {showTranscript && (
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto rounded-xl bg-secondary/50 p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {appointment.raw_transcript}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Status indicator for non-completed */}
        {appointment.status === 'analyzing' && (
          <Card className="border-2 border-accent/30">
            <CardContent className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-elder-lg font-bold text-foreground">Analyzing your appointment...</p>
              <p className="text-muted-foreground">This may take a moment.</p>
            </CardContent>
          </Card>
        )}

        {/* Citations & disclaimer (Apple Guideline 1.4.1) */}
        {appointment.plain_summary && (
          <MedicalDisclaimer variant="compact" />
        )}
      </div>
    </div>
  );
}
