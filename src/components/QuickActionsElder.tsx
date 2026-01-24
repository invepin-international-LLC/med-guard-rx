import { Plus, Camera, Phone, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsElderProps {
  onAddMedication?: () => void;
  onScan?: () => void;
  onCallPharmacy?: () => void;
  pharmacyPhone?: string;
}

export function QuickActionsElder({ 
  onAddMedication, 
  onScan, 
  onCallPharmacy,
  pharmacyPhone 
}: QuickActionsElderProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Button 
        variant="secondary" 
        size="lg" 
        className="flex-col h-auto py-5 gap-2 rounded-2xl"
        onClick={onAddMedication}
      >
        <Plus className="w-8 h-8" />
        <span className="text-lg font-semibold">Add Med</span>
      </Button>
      
      <Button 
        variant="secondary" 
        size="lg" 
        className="flex-col h-auto py-5 gap-2 rounded-2xl"
        onClick={onScan}
      >
        <Camera className="w-8 h-8" />
        <span className="text-lg font-semibold">Scan</span>
      </Button>
      
      <Button 
        variant="accent" 
        size="lg" 
        className="flex-col h-auto py-5 gap-2 rounded-2xl"
        onClick={() => {
          if (pharmacyPhone) {
            window.location.href = `tel:${pharmacyPhone}`;
          } else if (onCallPharmacy) {
            onCallPharmacy();
          }
        }}
      >
        <Phone className="w-8 h-8" />
        <span className="text-lg font-semibold">Pharmacy</span>
      </Button>
    </div>
  );
}
