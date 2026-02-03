import { useState } from 'react';
import { UserCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCaregiver } from '@/hooks/useCaregiver';

interface AcceptInviteCardProps {
  onAccepted?: () => void;
}

export function AcceptInviteCard({ onAccepted }: AcceptInviteCardProps) {
  const { acceptInvitation } = useCaregiver();
  const [showDialog, setShowDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!inviteCode.trim()) return;
    
    setAccepting(true);
    const success = await acceptInvitation(inviteCode.trim());
    setAccepting(false);
    
    if (success) {
      setInviteCode('');
      setShowDialog(false);
      onAccepted?.();
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Become a Caregiver
        </CardTitle>
        <CardDescription>
          Have an invite code? Enter it to start caring for someone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Enter Invite Code
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Caregiver Invitation</DialogTitle>
              <DialogDescription>
                Enter the invite code shared with you to become a caregiver
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Invite Code</label>
                <Input 
                  placeholder="Enter code (e.g., ABC123)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={12}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleAccept}
                disabled={accepting || !inviteCode.trim()}
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By accepting, you'll be able to view their medication schedule and receive alerts for missed doses
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
