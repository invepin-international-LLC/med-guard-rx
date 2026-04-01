import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Stethoscope, Calendar, ChevronRight, Loader2, Mic, Clock, Bell } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentRecorder } from '@/components/AppointmentRecorder';
import { AppointmentSummary } from '@/components/AppointmentSummary';
import { AppointmentActions } from '@/components/AppointmentActions';
import { cn } from '@/lib/utils';
import { format, isFuture, isToday, isTomorrow, differenceInHours } from 'date-fns';

type AppointmentView = 'list' | 'new' | 'record' | 'summary';

export function AppointmentsPage() {
  const { appointments, loading, createAppointment, updateAppointment, deleteAppointment, refetch } = useAppointments();
  const [view, setView] = useState<AppointmentView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);

    // Build appointment date if provided
    let appointmentDate: string | undefined;
    if (newDate) {
      const dateStr = newTime ? `${newDate}T${newTime}` : `${newDate}T09:00`;
      appointmentDate = new Date(dateStr).toISOString();
    }

    const id = await createAppointment(newTitle.trim(), newDoctor.trim(), appointmentDate);
    if (id) {
      // If it's a future appointment, go back to list. If it's now, go to recording.
      if (appointmentDate && isFuture(new Date(appointmentDate))) {
        setView('list');
        refetch();
      } else {
        setSelectedId(id);
        setView('record');
      }
      setNewTitle('');
      setNewDoctor('');
      setNewDate('');
      setNewTime('');
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
    const isFutureAppointment = newDate && isFuture(new Date(newTime ? `${newDate}T${newTime}` : `${newDate}T23:59`));
    const todayStr = new Date().toISOString().split('T')[0];

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
          <div>
            <label className="text-sm font-bold text-foreground mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Appointment Date (optional)
            </label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={todayStr}
              className="h-14 text-elder-lg rounded-2xl"
            />
          </div>
          {newDate && (
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">
                <Clock className="w-4 h-4 inline mr-1" />
                Appointment Time
              </label>
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 text-elder-lg rounded-2xl"
              />
            </div>
          )}

          {isFutureAppointment && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Reminders will be sent</p>
                  <p className="text-xs text-muted-foreground">
                    You'll get a notification 24 hours and 1 hour before your appointment, along with a prompt to pre-load questions for your doctor.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
              {creating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isFutureAppointment ? (
                'Schedule'
              ) : (
                'Start Recording'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Separate upcoming scheduled vs past/recorded
  const upcoming = appointments.filter(
    (a) => a.status === 'scheduled' && a.appointment_date && isFuture(new Date(a.appointment_date))
  );
  const rest = appointments.filter(
    (a) => !(a.status === 'scheduled' && a.appointment_date && isFuture(new Date(a.appointment_date)))
  );

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d, yyyy');
  };

  const getTimeUntil = (dateStr: string) => {
    const hours = differenceInHours(new Date(dateStr), new Date());
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} away`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} away`;
  };

  // List view
  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-elder-2xl font-bold text-foreground">Appointments</h1>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => setView('new')}
          className="flex-1 h-14 rounded-2xl text-elder-base font-bold gap-2"
        >
          <Mic className="w-5 h-5" />
          Record Now
        </Button>
        <Button
          variant="outline"
          onClick={() => { setNewDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]); setView('new'); }}
          className="flex-1 h-14 rounded-2xl text-elder-base font-bold gap-2"
        >
          <Calendar className="w-5 h-5" />
          Schedule
        </Button>
      </div>

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
              Record your next doctor's visit or schedule an upcoming appointment to get reminders and pre-load questions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming scheduled appointments */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Upcoming
              </h2>
              {upcoming.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => {
                    setSelectedId(apt.id);
                    // If appointment is today, go to recorder; otherwise show questions prep
                    if (isToday(new Date(apt.appointment_date))) {
                      setView('record');
                    } else {
                      setView('record');
                    }
                  }}
                  className="w-full text-left"
                >
                  <Card className="border-2 border-primary/30 bg-primary/5 transition-all hover:shadow-md">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{apt.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {apt.doctor_name && <span>Dr. {apt.doctor_name}</span>}
                          {apt.doctor_name && <span>•</span>}
                          <span>{getDateLabel(apt.appointment_date)}</span>
                          {apt.appointment_date && (
                            <>
                              <span>•</span>
                              <span>{format(new Date(apt.appointment_date), 'h:mm a')}</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          📅 {getTimeUntil(apt.appointment_date)}
                        </span>
                      </div>
                      <AppointmentActions
                        appointment={apt}
                        onUpdate={updateAppointment}
                        onDelete={deleteAppointment}
                      />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {/* Past / recorded appointments */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {upcoming.length > 0 && (
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  Past Appointments
                </h2>
              )}
              {rest.map((apt) => {
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
      )}
    </div>
  );
}
