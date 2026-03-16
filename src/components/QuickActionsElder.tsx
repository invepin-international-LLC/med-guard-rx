import { Plus, Camera, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-3">
      <Button 
        variant="secondary" 
        size="lg" 
        className="flex-col h-auto py-5 gap-2 rounded-2xl"
        onClick={onAddMedication}
      >
        <Plus className="w-8 h-8" />
        <span className="text-lg font-semibold">{t('medications.addMed')}</span>
      </Button>
      
      <Button 
        variant="secondary" 
        size="lg" 
        className="flex-col h-auto py-5 gap-2 rounded-2xl"
        onClick={onScan}
      >
        <Camera className="w-8 h-8" />
        <span className="text-lg font-semibold">{t('nav.scan')}</span>
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
        <span className="text-lg font-semibold">{t('medications.pharmacy')}</span>
      </Button>
    </div>
  );
}