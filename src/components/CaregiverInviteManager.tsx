import { useState } from 'react';
import { Users, UserPlus, Copy, X, Clock, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCaregiver } from '@/hooks/useCaregiver';
import { formatDistanceToNow } from 'date-fns';

export function CaregiverInviteManager() {
  const { 
    relationships, 
    invitations, 
    createInvitation, 
    cancelInvitation, 
    removeCaregiver,
    loading 
  } = useCaregiver();
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('family');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    const invite = await createInvitation(email || undefined, relationship);
    if (invite) {
      setNewInviteCode(invite.invite_code);
      setEmail('');
    }
    setCreatingInvite(false);
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code.toUpperCase());
    toast.success('Invite code copied to clipboard!');
  };

  const shareInvite = async (code: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Med Guard Rx Caregiver Invite',
          text: `Join me as a caregiver on Med Guard Rx! Use invite code: ${code.toUpperCase()}`,
        });
      } catch (e) {
        copyInviteCode(code);
      }
    } else {
      copyInviteCode(code);
    }
  };

  const pendingInvites = invitations.filter(i => i.status === 'pending');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family & Caregivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Family & Caregivers
        </CardTitle>
        <CardDescription>
          Invite family members to view your medication schedule and receive alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Caregivers */}
        {relationships.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">My Caregivers</h4>
            {relationships.map((rel) => (
              <div 
                key={rel.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {rel.caregiver_profile?.name || 'Caregiver'}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {rel.relationship}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeCaregiver(rel.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Pending Invitations</h4>
            {pendingInvites.map((invite) => (
              <div 
                key={invite.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-dashed"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                        {invite.invite_code.toUpperCase()}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyInviteCode(invite.invite_code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => shareInvite(invite.invite_code)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => cancelInvitation(invite.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invite Button */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Caregiver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Caregiver</DialogTitle>
              <DialogDescription>
                Generate an invite code to share with a family member or caregiver
              </DialogDescription>
            </DialogHeader>

            {newInviteCode ? (
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2">
                  <Check className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="font-medium">Invitation Created!</p>
                </div>
                
                <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
                  <code className="text-2xl font-mono font-bold tracking-wider">
                    {newInviteCode.toUpperCase()}
                  </code>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => copyInviteCode(newInviteCode)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => shareInvite(newInviteCode)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  This code expires in 7 days
                </p>

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setNewInviteCode(null);
                    setShowInviteDialog(false);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Relationship</label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family Member</SelectItem>
                      <SelectItem value="spouse">Spouse/Partner</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="caregiver">Professional Caregiver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email (optional)</label>
                  <Input 
                    type="email"
                    placeholder="caregiver@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For your records only - we won't send them an email
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                >
                  {creatingInvite ? 'Creating...' : 'Generate Invite Code'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {relationships.length === 0 && pendingInvites.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-2">
            No caregivers yet. Invite someone to help track your medications!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
