import { UserProfile } from '@/types/medication';
import { Phone, AlertCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmergencyCardProps {
  user: UserProfile;
}

export function EmergencyCard({ user }: EmergencyCardProps) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-elder-lg text-foreground">Emergency Info</h2>
      </div>

      {/* Allergies */}
      {user.allergies.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Drug Allergies</p>
          <div className="flex flex-wrap gap-2">
            {user.allergies.map((allergy, index) => (
              <span 
                key={index}
                className="bg-destructive/10 text-destructive px-3 py-1 rounded-full font-medium"
              >
                ⚠️ {allergy}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      {user.conditions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Medical Conditions</p>
          <div className="flex flex-wrap gap-2">
            {user.conditions.map((condition, index) => (
              <span 
                key={index}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium"
              >
                <Heart className="w-4 h-4 inline mr-1" />
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {user.emergencyContact && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Emergency Contact</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-semibold">{user.emergencyContact.name}</p>
              <p className="text-muted-foreground">{user.emergencyContact.relationship}</p>
            </div>
            <Button variant="accent" size="lg" asChild>
              <a href={`tel:${user.emergencyContact.phone}`}>
                <Phone className="w-5 h-5 mr-2" />
                Call
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
