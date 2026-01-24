import { Phone, AlertCircle, Heart, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface EmergencyInfo {
  name: string;
  dateOfBirth?: string;
  allergies: string[];
  conditions: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

interface EmergencyCardElderProps {
  info: EmergencyInfo;
  showQRCode?: boolean;
}

export function EmergencyCardElder({ info, showQRCode = true }: EmergencyCardElderProps) {
  const [qrVisible, setQrVisible] = useState(false);

  // Generate QR code data
  const qrData = JSON.stringify({
    name: info.name,
    dob: info.dateOfBirth,
    allergies: info.allergies,
    conditions: info.conditions,
    emergency: info.emergencyContact,
  });

  return (
    <div className="bg-card rounded-3xl p-6 shadow-elder-lg border-4 border-destructive/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="w-9 h-9 text-destructive" />
          </div>
          <div>
            <h2 className="text-elder-xl text-foreground">Emergency Info</h2>
            <p className="text-muted-foreground text-lg">Medical ID</p>
          </div>
        </div>
        
        {showQRCode && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setQrVisible(!qrVisible)}
            className="w-14 h-14 rounded-xl border-2"
          >
            <QrCode className="w-7 h-7" />
          </Button>
        )}
      </div>

      {/* QR Code (simulated) */}
      {qrVisible && (
        <div className="bg-white p-6 rounded-2xl mb-6 flex flex-col items-center">
          <div className="w-48 h-48 bg-[repeating-conic-gradient(#000_0_25%,#fff_0_50%)] bg-[length:20px_20px] rounded-lg mb-4" />
          <p className="text-muted-foreground text-center">
            Scan for emergency information
          </p>
          <Button variant="secondary" size="sm" className="mt-2">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      )}

      {/* Patient Info */}
      <div className="bg-muted/50 rounded-2xl p-5 mb-5">
        <p className="text-elder-lg text-foreground font-bold">{info.name}</p>
        {info.dateOfBirth && (
          <p className="text-muted-foreground text-lg">
            DOB: {new Date(info.dateOfBirth).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        )}
      </div>

      {/* Allergies */}
      {info.allergies.length > 0 && (
        <div className="mb-5">
          <p className="text-lg text-muted-foreground mb-3 font-semibold">⚠️ Drug Allergies</p>
          <div className="flex flex-wrap gap-3">
            {info.allergies.map((allergy, index) => (
              <span 
                key={index}
                className="bg-destructive/15 text-destructive px-5 py-2 rounded-full font-bold text-lg border-2 border-destructive/30"
              >
                {allergy}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      {info.conditions.length > 0 && (
        <div className="mb-6">
          <p className="text-lg text-muted-foreground mb-3 font-semibold">❤️ Medical Conditions</p>
          <div className="flex flex-wrap gap-3">
            {info.conditions.map((condition, index) => (
              <span 
                key={index}
                className="bg-info/15 text-info px-5 py-2 rounded-full font-bold text-lg border-2 border-info/30 flex items-center gap-2"
              >
                <Heart className="w-5 h-5" />
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {info.emergencyContact && (
        <div className="pt-5 border-t-2 border-border">
          <p className="text-lg text-muted-foreground mb-3 font-semibold">🚨 Emergency Contact</p>
          <div className="flex items-center justify-between bg-accent/10 rounded-2xl p-5 border-2 border-accent/30">
            <div>
              <p className="text-elder-lg text-foreground font-bold">{info.emergencyContact.name}</p>
              <p className="text-muted-foreground text-lg">{info.emergencyContact.relationship}</p>
            </div>
            <Button variant="accent" size="xl" asChild>
              <a href={`tel:${info.emergencyContact.phone}`}>
                <Phone className="w-7 h-7 mr-2" />
                Call
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
