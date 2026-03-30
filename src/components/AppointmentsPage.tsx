import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Stethoscope, Calendar, ChevronRight, Loader2, Mic } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentRecorder } from '@/components/AppointmentRecorder';
import { AppointmentSummary } from '@/components/AppointmentSummary';
import { cn } from '@/lib/utils';

type AppointmentView = 'list' | 'new' | 'record' | 'summary';

export function AppointmentsPage() {
  const { appointments, loading, createAppointment, refetch } = useAppointments();
  const [view, setView] = useState<AppointmentView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const id = await createAppointment(newTitle.trim(), newDoctor.trim());
    if (id) {
      setSelectedId(id);
      setView('record');
      setNewTitle('');
      setNewDoctor('');
    }
    setCreating(false);
  };

  if (view === 'record' && selectedId) {
    return (
      <AppointmentRecorder
        appointmentId={selectedId}
        onBack={() => { setView('list'); refetch(); }}
        onAnalysisComplete={() => { setView('summary'); refetch(); }}
      />
    );
  }

  if (view === 'summary' && selectedId) {
    return (
      <AppointmentSummary
        appointmentId={selectedId}
        onBack={() => { setView('list'); refetch(); }}
      />
    );
  }

  if (view === 'new') {
    return (
      <div className="min-h-screen bg-background p-4 pb-32">
        <h1 className="text-elder-2xl font-bold text-foreground mb-6">New Appointment</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-foreground mb-2 block">Appointment Title *</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Annual Checkup, Cardiology Follow-up"
              className="h-14 text-elder-lg rounded-2xl"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground mb-2 block">Doctor's Name (optional)</label>
            <Input
              value={newDoctor}
              onChange={(e) => setNewDoctor(e.target.value)}
              placeholder="e.g. Smith, Johnson"
              className="h-14 text-elder-lg rounded-2xl"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setView('list')}
              className="flex-1 h-14 rounded-2xl text-elder-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              className="flex-1 h-14 rounded-2xl text-elder-lg font-bold"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Recording'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-elder-2xl font-bold text-foreground">Appointments</h1>
      </div>

      {/* New Appointment CTA */}
      <Button
        onClick={() => setView('new')}
        className="w-full h-16 mb-6 rounded-2xl text-elder-lg font-bold gap-3"
      >
        <Mic className="w-6 h-6" />
        Record New Appointment
      </Button>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Stethoscope className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-elder-xl font-bold text-foreground">No Appointments Yet</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Record your next doctor's visit and get a plain-English summary with follow-up reminders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const isCompleted = apt.status === 'completed';
            const isRecording = apt.status === 'recording';
            const isAnalyzing = apt.status === 'analyzing';

            return (
              <button
                key={apt.id}
                onClick={() => {
                  setSelectedId(apt.id);
                  setView(isCompleted || isAnalyzing ? 'summary' : 'record');
                }}
                className="w-full text-left"
              >
                <Card className={cn(
                  "transition-all hover:shadow-md border-2",
                  isRecording && "border-accent/30",
                  isCompleted && "border-primary/20",
                  isAnalyzing && "border-accent/50 animate-pulse"
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      isCompleted ? "bg-primary/10" : "bg-accent/10"
                    )}>
                      {isCompleted ? (
                        <Stethoscope className="w-6 h-6 text-primary" />
                      ) : (
                        <Mic className={cn("w-6 h-6", isAnalyzing ? "text-accent animate-pulse" : "text-accent")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{apt.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {apt.doctor_name && <span>Dr. {apt.doctor_name}</span>}
                        <span>•</span>
                        <span>{new Date(apt.appointment_date).toLocaleDateString()}</span>
                      </div>
                      <span className={cn(
                        "text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded-full",
                        isCompleted && "bg-primary/10 text-primary",
                        isRecording && "bg-accent/10 text-accent-foreground",
                        isAnalyzing && "bg-accent/20 text-accent-foreground"
                      )}>
                        {isCompleted ? '✅ Analyzed' : isAnalyzing ? '⏳ Analyzing...' : '🎙️ In Progress'}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
