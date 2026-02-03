import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Pill, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flame,
  Heart,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCaregiver } from '@/hooks/useCaregiver';
import { AcceptInviteCard } from '@/components/AcceptInviteCard';
import { formatDistanceToNow, format } from 'date-fns';

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const { 
    patientsICareFor, 
    patientOverviews, 
    isCaregiver, 
    loading,
    getPatientDetails,
    leaveAsCaregiver,
    refresh
  } = useCaregiver();

  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load patient details when selected
  useEffect(() => {
    if (selectedPatient) {
      setLoadingDetails(true);
      getPatientDetails(selectedPatient).then(details => {
        setPatientDetails(details);
        setLoadingDetails(false);
      });
    }
  }, [selectedPatient, getPatientDetails]);

  const selectedOverview = patientOverviews.find(p => p.patient_id === selectedPatient);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Patient detail view
  if (selectedPatient && selectedOverview) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4">
          <div className="max-w-2xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary-foreground mb-2 -ml-2"
              onClick={() => setSelectedPatient(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Heart className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{selectedOverview.patient_name}</h1>
                <p className="text-primary-foreground/80 capitalize">{selectedOverview.relationship}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Flame className="h-6 w-6 mx-auto text-orange-500 mb-1" />
                <p className="text-2xl font-bold">{selectedOverview.current_streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Activity className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{selectedOverview.adherence_percentage}%</p>
                <p className="text-xs text-muted-foreground">Weekly</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Pill className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{selectedOverview.medications_count}</p>
                <p className="text-xs text-muted-foreground">Medications</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selectedOverview.today_doses_taken} of {selectedOverview.today_doses_total} doses taken
                </span>
                <span className="text-sm font-medium">
                  {selectedOverview.today_doses_total > 0 
                    ? Math.round((selectedOverview.today_doses_taken / selectedOverview.today_doses_total) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={selectedOverview.today_doses_total > 0 
                  ? (selectedOverview.today_doses_taken / selectedOverview.today_doses_total) * 100 
                  : 0} 
              />
              {selectedOverview.last_activity && (
                <p className="text-xs text-muted-foreground">
                  Last activity: {formatDistanceToNow(new Date(selectedOverview.last_activity), { addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dose Schedule */}
          {loadingDetails ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ) : patientDetails && (
            <Tabs defaultValue="today">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="today">Today's Doses</TabsTrigger>
                <TabsTrigger value="medications">Medications</TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="mt-4 space-y-2">
                {patientDetails.todayLogs.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      No doses scheduled for today
                    </CardContent>
                  </Card>
                ) : (
                  patientDetails.todayLogs.map((log: any) => (
                    <Card key={log.id} className={
                      log.status === 'taken' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' :
                      log.status === 'missed' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' :
                      ''
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {log.status === 'taken' ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : log.status === 'missed' ? (
                              <XCircle className="h-6 w-6 text-red-600" />
                            ) : (
                              <Clock className="h-6 w-6 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{log.medications?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {log.medications?.strength} • {log.medications?.form}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(new Date(log.scheduled_for), 'h:mm a')}
                            </p>
                            <Badge variant={
                              log.status === 'taken' ? 'default' :
                              log.status === 'missed' ? 'destructive' :
                              'secondary'
                            } className="text-xs">
                              {log.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="medications" className="mt-4 space-y-2">
                {patientDetails.medications.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      No active medications
                    </CardContent>
                  </Card>
                ) : (
                  patientDetails.medications.map((med: any) => (
                    <Card key={med.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Pill className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{med.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {med.strength} • {med.form}
                            </p>
                            {med.purpose && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {med.purpose}
                              </p>
                            )}
                          </div>
                          {med.quantity_remaining !== null && med.quantity_remaining < 10 && (
                            <Badge variant="destructive" className="text-xs">
                              Low Supply
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard - list of patients
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary-foreground mb-2 -ml-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to My Meds
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Caregiver Dashboard</h1>
              <p className="text-primary-foreground/80">Monitor your loved ones</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Accept Invite Card */}
        <AcceptInviteCard onAccepted={refresh} />

        {/* Patients I Care For */}
        {patientsICareFor.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">People I Care For</h2>
            {patientOverviews.map((patient) => (
              <Card 
                key={patient.patient_id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPatient(patient.patient_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Heart className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{patient.patient_name}</h3>
                        <Badge variant="outline" className="capitalize">
                          {patient.relationship}
                        </Badge>
                      </div>
                      
                      {/* Today's progress */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Today</span>
                          <span className="font-medium">
                            {patient.today_doses_taken}/{patient.today_doses_total} doses
                          </span>
                        </div>
                        <Progress 
                          value={patient.today_doses_total > 0 
                            ? (patient.today_doses_taken / patient.today_doses_total) * 100 
                            : 0} 
                          className="h-2"
                        />
                      </div>

                      {/* Quick stats */}
                      <div className="flex gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span>{patient.current_streak} day streak</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span>{patient.adherence_percentage}% weekly</span>
                        </div>
                      </div>

                      {/* Alert if missed doses today */}
                      {patient.today_doses_total > 0 && 
                       patient.today_doses_taken < patient.today_doses_total && (
                        <div className="mt-2 flex items-center gap-1 text-amber-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            {patient.today_doses_total - patient.today_doses_taken} dose(s) pending
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No One to Care For Yet</h3>
              <p className="text-sm text-muted-foreground">
                Ask a loved one to share their invite code with you to start monitoring their medication adherence
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
