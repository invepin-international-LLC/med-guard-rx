import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { 
  Phone, 
  Plus, 
  Trash2, 
  Pencil, 
  Bell, 
  BellOff, 
  User, 
  Heart,
  AlertCircle,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_caregiver: boolean;
  notify_on_missed_dose: boolean;
}

interface EmergencyContactsManagerProps {
  onClose?: () => void;
}

export function EmergencyContactsManager({ onClose }: EmergencyContactsManagerProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRelationship, setFormRelationship] = useState('');
  const [formIsCaregiver, setFormIsCaregiver] = useState(false);
  const [formNotifyMissed, setFormNotifyMissed] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRelationship('');
    setFormIsCaregiver(false);
    setFormNotifyMissed(false);
    setEditingContact(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormRelationship(contact.relationship || '');
    setFormIsCaregiver(contact.is_caregiver);
    setFormNotifyMissed(contact.notify_on_missed_dose);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const contactData = {
        name: formName.trim(),
        phone: formPhone.trim(),
        relationship: formRelationship.trim() || null,
        is_caregiver: formIsCaregiver,
        notify_on_missed_dose: formNotifyMissed,
        user_id: user.id,
      };

      if (editingContact) {
        // Update existing
        const { error } = await supabase
          .from('emergency_contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Contact updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('emergency_contacts')
          .insert(contactData);

        if (error) throw error;
        toast.success('Contact added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteContactId) return;

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', deleteContactId);

      if (error) throw error;
      toast.success('Contact deleted');
      setDeleteContactId(null);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const toggleNotifyMissedDose = async (contact: EmergencyContact) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .update({ notify_on_missed_dose: !contact.notify_on_missed_dose })
        .eq('id', contact.id);

      if (error) throw error;
      
      toast.success(
        !contact.notify_on_missed_dose 
          ? `${contact.name} will be notified on missed doses`
          : `Notifications disabled for ${contact.name}`
      );
      fetchContacts();
    } catch (error) {
      console.error('Error updating notification setting:', error);
      toast.error('Failed to update setting');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-elder-xl text-foreground">Emergency Contacts</h2>
            <p className="text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-lg" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-info/10 rounded-2xl p-4 border-2 border-info/30 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-info flex-shrink-0 mt-0.5" />
        <p className="text-foreground">
          Enable <strong>"Notify on missed dose"</strong> to send SMS alerts to caregivers when you miss a medication.
        </p>
      </div>

      {/* Contact List */}
      <div className="space-y-4">
        {contacts.length === 0 ? (
          <div className="text-center py-12 bg-muted/50 rounded-2xl border-2 border-dashed border-border">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-elder text-muted-foreground mb-2">No emergency contacts yet</p>
            <p className="text-muted-foreground mb-6">Add contacts who can help in an emergency</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className={cn(
                "bg-card rounded-2xl p-5 border-2 shadow-elder transition-all",
                contact.notify_on_missed_dose 
                  ? "border-success/50" 
                  : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Contact Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0",
                    contact.is_caregiver ? "bg-accent/20" : "bg-secondary"
                  )}>
                    {contact.is_caregiver ? (
                      <Heart className="w-7 h-7 text-accent" />
                    ) : (
                      <User className="w-7 h-7 text-secondary-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-elder-lg text-foreground truncate">{contact.name}</h3>
                    {contact.relationship && (
                      <p className="text-muted-foreground truncate">{contact.relationship}</p>
                    )}
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-primary font-semibold text-lg hover:underline"
                    >
                      {contact.phone}
                    </a>
                    {contact.is_caregiver && (
                      <span className="inline-flex items-center gap-1 mt-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">
                        <Heart className="w-4 h-4" />
                        Caregiver
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => openEditDialog(contact)}
                      className="h-10 w-10"
                    >
                      <Pencil className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setDeleteContactId(contact.id)}
                      className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notify Toggle */}
              <div 
                className={cn(
                  "mt-4 pt-4 border-t flex items-center justify-between",
                  contact.notify_on_missed_dose ? "border-success/30" : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  {contact.notify_on_missed_dose ? (
                    <Bell className="w-6 h-6 text-success" />
                  ) : (
                    <BellOff className="w-6 h-6 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">Notify on missed dose</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.notify_on_missed_dose 
                        ? "SMS alerts enabled" 
                        : "No alerts will be sent"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={contact.notify_on_missed_dose}
                  onCheckedChange={() => toggleNotifyMissedDose(contact)}
                  className="scale-125"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      <Button 
        onClick={openAddDialog}
        className="w-full h-16 text-elder-lg gap-3"
        size="xl"
      >
        <Plus className="w-7 h-7" />
        Add Emergency Contact
      </Button>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-elder-xl">
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg font-semibold">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Michael (Son)"
                className="h-14 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-lg font-semibold">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g., (555) 234-5678"
                className="h-14 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship" className="text-lg font-semibold">Relationship</Label>
              <Input
                id="relationship"
                value={formRelationship}
                onChange={(e) => setFormRelationship(e.target.value)}
                placeholder="e.g., Son, Daughter, Caregiver"
                className="h-14 text-lg"
              />
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-secondary rounded-xl">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Is a Caregiver</p>
                  <p className="text-sm text-muted-foreground">Helps manage medications</p>
                </div>
              </div>
              <Switch
                checked={formIsCaregiver}
                onCheckedChange={setFormIsCaregiver}
              />
            </div>

            <div className={cn(
              "flex items-center justify-between py-3 px-4 rounded-xl border-2 transition-colors",
              formNotifyMissed 
                ? "bg-success/10 border-success/30" 
                : "bg-muted border-border"
            )}>
              <div className="flex items-center gap-3">
                {formNotifyMissed ? (
                  <Bell className="w-6 h-6 text-success" />
                ) : (
                  <BellOff className="w-6 h-6 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold text-foreground">Notify on Missed Dose</p>
                  <p className="text-sm text-muted-foreground">
                    Send SMS when doses are missed
                  </p>
                </div>
              </div>
              <Switch
                checked={formNotifyMissed}
                onCheckedChange={setFormNotifyMissed}
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {editingContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-elder-xl">Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              This contact will be permanently removed and will no longer receive missed dose alerts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="h-12 bg-destructive hover:bg-destructive/90"
            >
              Delete Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
