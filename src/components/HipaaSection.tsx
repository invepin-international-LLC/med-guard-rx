import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Heart, 
  Stethoscope, 
  FileText, 
  Syringe, 
  Building2, 
  CreditCard, 
  Phone, 
  User,
  Plus,
  Trash2,
  Clock,
  Lock,
  AlertTriangle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HipaaReAuthModal } from './HipaaReAuthModal';
import { useHipaaRecords, Diagnosis, ProviderInfo, InsuranceInfo } from '@/hooks/useHipaaRecords';
import { toast } from 'sonner';

interface HipaaSectionProps {
  onClose: () => void;
}

export function HipaaSection({ onClose }: HipaaSectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  const {
    record,
    loading,
    createRecord,
    updateSection,
  } = useHipaaRecords();

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleCancelAuth = () => {
    setShowAuthModal(false);
    onClose();
  };

  // Initialize record if needed
  const initializeRecord = async () => {
    await createRecord();
  };

  if (!isAuthenticated) {
    return (
      <HipaaReAuthModal
        isOpen={showAuthModal}
        onClose={handleCancelAuth}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Set Up Your Health Vault</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Securely store your medical records, insurance information, and emergency health data.
        </p>
        <Button onClick={initializeRecord} size="lg" className="gap-2">
          <Lock className="w-5 h-5" />
          Initialize Secure Health Records
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Header */}
      <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl border-2 border-success/20">
        <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-success">HIPAA Protected Health Information</h3>
          <p className="text-sm text-muted-foreground">
            End-to-end encrypted • Access logged for compliance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs py-2">
            <FileText className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="medical" className="text-xs py-2">
            <Heart className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="providers" className="text-xs py-2">
            <Stethoscope className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs py-2">
            <CreditCard className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Personal Health Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-primary" />
                Personal Health Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Blood Type</Label>
                  <p className="text-lg font-semibold">{record.bloodType || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Organ Donor</Label>
                  <p className="text-lg font-semibold">{record.organDonor ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Advance Directives</Label>
                <p className="mt-1">{record.advanceDirectives || 'Not specified'}</p>
              </div>

              {record.medicalPowerOfAttorney && (
                <div className="p-3 bg-muted rounded-xl">
                  <Label className="text-muted-foreground text-sm">Medical Power of Attorney</Label>
                  <p className="font-medium">{record.medicalPowerOfAttorney.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.medicalPowerOfAttorney.phone}
                    {record.medicalPowerOfAttorney.relationship && ` • ${record.medicalPowerOfAttorney.relationship}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setActiveTab('medical')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{record.diagnoses.length}</p>
                  <p className="text-sm text-muted-foreground">Diagnoses</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setActiveTab('medical')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Syringe className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{record.immunizations.length}</p>
                  <p className="text-sm text-muted-foreground">Immunizations</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Last Access */}
          {record.lastAccessedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Last accessed: {new Date(record.lastAccessedAt).toLocaleString()}
            </div>
          )}
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="medical" className="mt-4 space-y-4">
          {/* Diagnoses */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  Diagnoses
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {record.diagnoses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No diagnoses recorded</p>
              ) : (
                <div className="space-y-3">
                  {record.diagnoses.map((diagnosis, index) => (
                    <div key={diagnosis.id || index} className="p-3 bg-muted rounded-xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{diagnosis.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {diagnosis.diagnosedDate} • {diagnosis.provider}
                          </p>
                          {diagnosis.icdCode && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              ICD: {diagnosis.icdCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Immunizations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Syringe className="w-5 h-5 text-success" />
                  Immunizations
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {record.immunizations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No immunizations recorded</p>
              ) : (
                <div className="space-y-3">
                  {record.immunizations.map((immunization, index) => (
                    <div key={immunization.id || index} className="p-3 bg-muted rounded-xl">
                      <p className="font-medium">{immunization.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {immunization.date}
                        {immunization.nextDueDate && ` • Next: ${immunization.nextDueDate}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="mt-4 space-y-4">
          {/* Primary Care */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="w-5 h-5 text-primary" />
                Primary Care Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              {record.primaryCareProvider ? (
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{record.primaryCareProvider.name}</p>
                  {record.primaryCareProvider.specialty && (
                    <Badge variant="secondary">{record.primaryCareProvider.specialty}</Badge>
                  )}
                  {record.primaryCareProvider.phone && (
                    <a 
                      href={`tel:${record.primaryCareProvider.phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {record.primaryCareProvider.phone}
                    </a>
                  )}
                  {record.primaryCareProvider.address && (
                    <p className="text-sm text-muted-foreground">{record.primaryCareProvider.address}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">No primary care provider set</p>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> Add Provider
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specialists */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5 text-accent" />
                  Specialists
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {record.specialists.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No specialists recorded</p>
              ) : (
                <div className="space-y-3">
                  {record.specialists.map((specialist, index) => (
                    <div key={index} className="p-3 bg-muted rounded-xl">
                      <p className="font-medium">{specialist.name}</p>
                      {specialist.specialty && (
                        <Badge variant="secondary" className="mt-1">{specialist.specialty}</Badge>
                      )}
                      {specialist.phone && (
                        <p className="text-sm text-muted-foreground mt-1">{specialist.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                Insurance Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {record.insuranceInfo ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Provider</Label>
                    <p className="text-lg font-semibold">{record.insuranceInfo.provider}</p>
                  </div>
                  {record.insuranceInfo.planName && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Plan</Label>
                      <p className="font-medium">{record.insuranceInfo.planName}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Member ID</Label>
                      <p className="font-mono font-medium">{record.insuranceInfo.memberId}</p>
                    </div>
                    {record.insuranceInfo.groupNumber && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Group Number</Label>
                        <p className="font-mono font-medium">{record.insuranceInfo.groupNumber}</p>
                      </div>
                    )}
                  </div>
                  {record.insuranceInfo.phone && (
                    <a 
                      href={`tel:${record.insuranceInfo.phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {record.insuranceInfo.phone}
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No insurance information on file</p>
                  <Button variant="outline" className="gap-1">
                    <Plus className="w-4 h-4" /> Add Insurance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Notice */}
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">Emergency Access</p>
                <p className="text-sm text-muted-foreground">
                  This information can be shared with emergency responders when needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
