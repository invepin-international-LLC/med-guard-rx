import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';

interface MedicationData {
  id: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  purpose?: string;
  instructions?: string;
  prescriber?: string;
  refillDate?: string;
}

interface MedicationEditSheetProps {
  medication: MedicationData | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: MedicationData) => Promise<void>;
}

const formOptions = [
  { value: 'pill', label: 'Pill' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'injection', label: 'Injection' },
  { value: 'patch', label: 'Patch' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'drops', label: 'Drops' },
  { value: 'cream', label: 'Cream' },
  { value: 'other', label: 'Other' },
];

export function MedicationEditSheet({ medication, open, onClose, onSave }: MedicationEditSheetProps) {
  const [formData, setFormData] = useState<MedicationData>({
    id: '',
    name: '',
    strength: '',
    form: 'pill',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medication) {
      setFormData({
        id: medication.id,
        name: medication.name,
        genericName: medication.genericName || '',
        strength: medication.strength,
        form: medication.form,
        purpose: medication.purpose || '',
        instructions: medication.instructions || '',
        prescriber: medication.prescriber || '',
        refillDate: medication.refillDate || '',
      });
    }
  }, [medication]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Medication name is required');
      return;
    }
    if (!formData.strength.trim()) {
      toast.error('Strength is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Medication updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving medication:', error);
      toast.error('Failed to save medication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="pb-4 border-b-2 border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-elder-xl">Edit Medication</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-lg font-semibold">
              Medication Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Metformin"
              className="h-14 text-lg rounded-xl"
            />
          </div>

          {/* Generic Name */}
          <div className="space-y-2">
            <Label htmlFor="genericName" className="text-lg font-semibold">
              Generic Name
            </Label>
            <Input
              id="genericName"
              value={formData.genericName || ''}
              onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
              placeholder="e.g., Metformin Hydrochloride"
              className="h-14 text-lg rounded-xl"
            />
          </div>

          {/* Strength */}
          <div className="space-y-2">
            <Label htmlFor="strength" className="text-lg font-semibold">
              Strength *
            </Label>
            <Input
              id="strength"
              value={formData.strength}
              onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
              placeholder="e.g., 500mg"
              className="h-14 text-lg rounded-xl"
            />
          </div>

          {/* Form */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold">Form</Label>
            <Select
              value={formData.form}
              onValueChange={(value) => setFormData({ ...formData, form: value })}
            >
              <SelectTrigger className="h-14 text-lg rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-border z-50">
                {formOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-lg py-3"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose" className="text-lg font-semibold">
              What It's For
            </Label>
            <Textarea
              id="purpose"
              value={formData.purpose || ''}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g., Controls blood sugar levels"
              className="text-lg rounded-xl min-h-[100px]"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-lg font-semibold">
              Instructions
            </Label>
            <Textarea
              id="instructions"
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="e.g., Take with food"
              className="text-lg rounded-xl min-h-[100px]"
            />
          </div>

          {/* Prescriber */}
          <div className="space-y-2">
            <Label htmlFor="prescriber" className="text-lg font-semibold">
              Prescriber
            </Label>
            <Input
              id="prescriber"
              value={formData.prescriber || ''}
              onChange={(e) => setFormData({ ...formData, prescriber: e.target.value })}
              placeholder="e.g., Dr. Smith"
              className="h-14 text-lg rounded-xl"
            />
          </div>

          {/* Refill Date */}
          <div className="space-y-2">
            <Label htmlFor="refillDate" className="text-lg font-semibold">
              Next Refill Date
            </Label>
            <Input
              id="refillDate"
              type="date"
              value={formData.refillDate || ''}
              onChange={(e) => setFormData({ ...formData, refillDate: e.target.value })}
              className="h-14 text-lg rounded-xl"
            />
          </div>

          {/* Save Button */}
          <Button
            variant="accent"
            size="xl"
            className="w-full mt-8"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
