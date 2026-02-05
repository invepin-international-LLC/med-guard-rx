 import { useState } from 'react';
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Textarea } from '@/components/ui/textarea';
 import { toast } from 'sonner';
 import { Pill, Plus, Clock } from 'lucide-react';
 
 interface AddMedicationSheetProps {
   open: boolean;
   onClose: () => void;
   onSave: (medication: NewMedicationData) => Promise<void>;
 }
 
 export interface NewMedicationData {
   name: string;
   genericName?: string;
   strength: string;
   form: string;
   purpose?: string;
   instructions?: string;
   prescriber?: string;
   // Schedule info
   schedules: {
     time: string;
     timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
   }[];
 }
 
 const FORM_OPTIONS = [
   { value: 'pill', label: 'Pill / Tablet' },
   { value: 'capsule', label: 'Capsule' },
   { value: 'liquid', label: 'Liquid' },
   { value: 'injection', label: 'Injection' },
   { value: 'patch', label: 'Patch' },
   { value: 'inhaler', label: 'Inhaler' },
   { value: 'drops', label: 'Drops' },
   { value: 'cream', label: 'Cream / Ointment' },
 ];
 
 const TIME_OF_DAY_OPTIONS = [
   { value: 'morning', label: 'Morning', defaultTime: '08:00' },
   { value: 'afternoon', label: 'Afternoon', defaultTime: '12:00' },
   { value: 'evening', label: 'Evening', defaultTime: '18:00' },
   { value: 'bedtime', label: 'Bedtime', defaultTime: '21:00' },
 ];
 
 export function AddMedicationSheet({ open, onClose, onSave }: AddMedicationSheetProps) {
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState<NewMedicationData>({
     name: '',
     genericName: '',
     strength: '',
     form: 'pill',
     purpose: '',
     instructions: '',
     prescriber: '',
     schedules: [{ time: '08:00', timeOfDay: 'morning' }],
   });
 
   const handleAddSchedule = () => {
     const nextTimeOfDay = TIME_OF_DAY_OPTIONS.find(
       t => !formData.schedules.some(s => s.timeOfDay === t.value)
     );
     if (nextTimeOfDay) {
       setFormData(prev => ({
         ...prev,
         schedules: [
           ...prev.schedules,
           { time: nextTimeOfDay.defaultTime, timeOfDay: nextTimeOfDay.value as 'morning' | 'afternoon' | 'evening' | 'bedtime' }
         ],
       }));
     }
   };
 
   const handleRemoveSchedule = (index: number) => {
     setFormData(prev => ({
       ...prev,
       schedules: prev.schedules.filter((_, i) => i !== index),
     }));
   };
 
   const handleScheduleChange = (index: number, field: 'time' | 'timeOfDay', value: string) => {
     setFormData(prev => ({
       ...prev,
       schedules: prev.schedules.map((s, i) => 
         i === index ? { ...s, [field]: value } : s
       ),
     }));
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     // Validation
     if (!formData.name.trim()) {
       toast.error('Please enter the medication name');
       return;
     }
     if (!formData.strength.trim()) {
       toast.error('Please enter the strength/dosage');
       return;
     }
     if (formData.schedules.length === 0) {
       toast.error('Please add at least one schedule');
       return;
     }
 
     try {
       setSaving(true);
       await onSave(formData);
       
       // Reset form
       setFormData({
         name: '',
         genericName: '',
         strength: '',
         form: 'pill',
         purpose: '',
         instructions: '',
         prescriber: '',
         schedules: [{ time: '08:00', timeOfDay: 'morning' }],
       });
       
       onClose();
     } catch (error) {
       console.error('Error saving medication:', error);
       toast.error('Failed to save medication');
     } finally {
       setSaving(false);
     }
   };
 
   const handleClose = () => {
     // Reset form on close
     setFormData({
       name: '',
       genericName: '',
       strength: '',
       form: 'pill',
       purpose: '',
       instructions: '',
       prescriber: '',
       schedules: [{ time: '08:00', timeOfDay: 'morning' }],
     });
     onClose();
   };
 
   return (
     <Sheet open={open} onOpenChange={handleClose}>
       <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
         <SheetHeader className="pb-4">
           <SheetTitle className="flex items-center gap-2 text-2xl">
             <Pill className="w-6 h-6 text-primary" />
             Add Medication
           </SheetTitle>
         </SheetHeader>
 
         <form onSubmit={handleSubmit} className="space-y-6 pb-8">
           {/* Medication Name */}
           <div className="space-y-2">
             <Label htmlFor="name" className="text-lg font-semibold">
               Medication Name *
             </Label>
             <Input
               id="name"
               placeholder="e.g., Lisinopril"
               value={formData.name}
               onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
               className="h-14 text-lg rounded-xl"
             />
           </div>
 
           {/* Generic Name */}
           <div className="space-y-2">
             <Label htmlFor="genericName" className="text-lg font-semibold">
               Generic Name (optional)
             </Label>
             <Input
               id="genericName"
               placeholder="e.g., Lisinopril"
               value={formData.genericName}
               onChange={(e) => setFormData(prev => ({ ...prev, genericName: e.target.value }))}
               className="h-14 text-lg rounded-xl"
             />
           </div>
 
           {/* Strength / Dosage */}
           <div className="space-y-2">
             <Label htmlFor="strength" className="text-lg font-semibold">
               Strength / Dosage *
             </Label>
             <Input
               id="strength"
               placeholder="e.g., 10mg, 500mg, 5ml"
               value={formData.strength}
               onChange={(e) => setFormData(prev => ({ ...prev, strength: e.target.value }))}
               className="h-14 text-lg rounded-xl"
             />
           </div>
 
           {/* Form Type */}
           <div className="space-y-2">
             <Label className="text-lg font-semibold">Form</Label>
             <Select
               value={formData.form}
               onValueChange={(value) => setFormData(prev => ({ ...prev, form: value }))}
             >
               <SelectTrigger className="h-14 text-lg rounded-xl">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {FORM_OPTIONS.map(option => (
                   <SelectItem key={option.value} value={option.value} className="text-lg">
                     {option.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Purpose */}
           <div className="space-y-2">
             <Label htmlFor="purpose" className="text-lg font-semibold">
               Purpose (optional)
             </Label>
             <Input
               id="purpose"
               placeholder="e.g., Blood pressure control"
               value={formData.purpose}
               onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
               className="h-14 text-lg rounded-xl"
             />
           </div>
 
           {/* Instructions */}
           <div className="space-y-2">
             <Label htmlFor="instructions" className="text-lg font-semibold">
               Instructions (optional)
             </Label>
             <Textarea
               id="instructions"
               placeholder="e.g., Take with food"
               value={formData.instructions}
               onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
               className="text-lg rounded-xl min-h-[80px]"
             />
           </div>
 
           {/* Prescriber */}
           <div className="space-y-2">
             <Label htmlFor="prescriber" className="text-lg font-semibold">
               Prescriber (optional)
             </Label>
             <Input
               id="prescriber"
               placeholder="e.g., Dr. Smith"
               value={formData.prescriber}
               onChange={(e) => setFormData(prev => ({ ...prev, prescriber: e.target.value }))}
               className="h-14 text-lg rounded-xl"
             />
           </div>
 
           {/* Schedules */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <Label className="text-lg font-semibold flex items-center gap-2">
                 <Clock className="w-5 h-5" />
                 When to Take *
               </Label>
               {formData.schedules.length < 4 && (
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={handleAddSchedule}
                   className="rounded-xl"
                 >
                   <Plus className="w-4 h-4 mr-1" />
                   Add Time
                 </Button>
               )}
             </div>
 
             <div className="space-y-3">
               {formData.schedules.map((schedule, index) => (
                 <div key={index} className="flex gap-3 items-center bg-secondary/50 p-3 rounded-xl">
                   <Select
                     value={schedule.timeOfDay}
                     onValueChange={(value) => handleScheduleChange(index, 'timeOfDay', value)}
                   >
                     <SelectTrigger className="flex-1 h-12 rounded-xl">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {TIME_OF_DAY_OPTIONS.map(option => (
                         <SelectItem key={option.value} value={option.value}>
                           {option.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   
                   <Input
                     type="time"
                     value={schedule.time}
                     onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                     className="w-32 h-12 rounded-xl text-center"
                   />
 
                   {formData.schedules.length > 1 && (
                     <Button
                       type="button"
                       variant="ghost"
                       size="icon"
                       onClick={() => handleRemoveSchedule(index)}
                       className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                     >
                       ×
                     </Button>
                   )}
                 </div>
               ))}
             </div>
           </div>
 
           {/* Submit Button */}
           <Button
             type="submit"
             variant="accent"
             size="xl"
             className="w-full"
             disabled={saving}
           >
             {saving ? 'Saving...' : 'Add Medication'}
           </Button>
         </form>
       </SheetContent>
     </Sheet>
   );
 }