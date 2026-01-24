import { Plus, Camera, Phone, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsBarProps {
  onAddMedication?: () => void;
  onScan?: () => void;
  onCallPharmacy?: () => void;
}

export function QuickActionsBar({ onAddMedication, onScan, onCallPharmacy }: QuickActionsBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <Button 
        variant="secondary" 
        size="lg" 
        className="flex-shrink-0 gap-2"
        onClick={onAddMedication}
      >
        <Plus className="w-5 h-5" />
        Add Medication
      </Button>
      
      <Button 
        variant="secondary" 
        size="lg" 
        className="flex-shrink-0 gap-2"
        onClick={onScan}
      >
        <Camera className="w-5 h-5" />
        Scan Label
      </Button>
      
      <Button 
        variant="accent" 
        size="lg" 
        className="flex-shrink-0 gap-2"
        onClick={onCallPharmacy}
      >
        <Phone className="w-5 h-5" />
        Pharmacist Help
      </Button>
    </div>
  );
}
