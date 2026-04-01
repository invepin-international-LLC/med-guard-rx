import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Loader2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  title: string;
  doctor_name: string | null;
  appointment_date: string;
  status: string;
}

interface AppointmentActionsProps {
  appointment: Appointment;
  onUpdate: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AppointmentActions({ appointment, onUpdate, onDelete }: AppointmentActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(appointment.title);
  const [doctorName, setDoctorName] = useState(appointment.doctor_name || '');
  const [date, setDate] = useState(
    appointment.appointment_date
      ? new Date(appointment.appointment_date).toISOString().split('T')[0]
      : ''
  );
  const [time, setTime] = useState(
    appointment.appointment_date
      ? new Date(appointment.appointment_date).toTimeString().slice(0, 5)
      : ''
  );

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const updates: Partial<Appointment> = {
      title: title.trim(),
      doctor_name: doctorName.trim() || null,
    };

    if (date) {
      const dateStr = time ? `${date}T${time}` : `${date}T09:00`;
      updates.appointment_date = new Date(dateStr).toISOString();
    }

    await onUpdate(appointment.id, updates);
    setSaving(false);
    setEditOpen(false);
    toast.success('Appointment updated');
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(appointment.id);
    setDeleting(false);
    setDeleteOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitle(appointment.title);
    setDoctorName(appointment.doctor_name || '');
    if (appointment.appointment_date) {
      const d = new Date(appointment.appointment_date);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
    }
    setEditOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteOpen(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleEditClick}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Edit appointment"
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
          aria-label="Delete appointment"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Edit Appointment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Checkup"
                className="h-14 text-elder-lg rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Doctor's Name</label>
              <Input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Smith"
                className="h-14 text-elder-lg rounded-2xl"
              />
            </div>
            {appointment.status === 'scheduled' && (
              <>
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={todayStr}
                    className="h-14 text-elder-lg rounded-2xl"
                  />
                </div>
                {date && (
                  <div>
                    <label className="text-sm font-bold text-foreground mb-2 block">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Time
                    </label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="h-14 text-elder-lg rounded-2xl"
                    />
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="flex-1 h-14 rounded-2xl text-elder-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 h-14 rounded-2xl text-elder-lg font-bold"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{appointment.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
