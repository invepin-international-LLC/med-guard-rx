import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, Smile, Meh, Frown, AlertCircle, Heart,
  ThermometerSun, Brain, Loader2, Calendar, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';
type Severity = 'mild' | 'moderate' | 'severe';

interface SymptomEntry {
  id: string;
  mood: Mood;
  symptoms: string[];
  severity: Severity;
  notes: string | null;
  created_at: string;
}

const MOOD_OPTIONS: { value: Mood; label: string; icon: typeof Smile; color: string }[] = [
  { value: 'great', label: 'Great', icon: Heart, color: 'text-success' },
  { value: 'good', label: 'Good', icon: Smile, color: 'text-accent' },
  { value: 'okay', label: 'Okay', icon: Meh, color: 'text-warning' },
  { value: 'bad', label: 'Bad', icon: Frown, color: 'text-destructive' },
  { value: 'terrible', label: 'Terrible', icon: AlertCircle, color: 'text-destructive' },
];

const COMMON_SYMPTOMS = [
  'Headache', 'Nausea', 'Dizziness', 'Fatigue', 'Insomnia',
  'Stomach Pain', 'Rash', 'Dry Mouth', 'Drowsiness', 'Anxiety',
  'Constipation', 'Appetite Change',
];

export function SymptomJournal() {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [mood, setMood] = useState<Mood>('okay');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setEntries((data || []) as SymptomEntry[]);
    } catch (e) {
      console.error('Error fetching symptom logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('symptom_logs').insert({
        user_id: user.id,
        mood,
        symptoms: selectedSymptoms,
        severity,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Symptom entry saved!');
      setShowAddSheet(false);
      resetForm();
      fetchEntries();
    } catch (e) {
      console.error('Error saving symptom log:', e);
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  }, [mood, selectedSymptoms, severity, notes, fetchEntries]);

  const resetForm = () => {
    setMood('okay');
    setSelectedSymptoms([]);
    setSeverity('mild');
    setNotes('');
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const getMoodIcon = (m: Mood) => {
    const option = MOOD_OPTIONS.find(o => o.value === m);
    if (!option) return null;
    const Icon = option.icon;
    return <Icon className={cn('w-5 h-5', option.color)} />;
  };

  const getSeverityColor = (s: Severity) => {
    if (s === 'mild') return 'bg-success/20 text-success';
    if (s === 'moderate') return 'bg-warning/20 text-warning';
    return 'bg-destructive/20 text-destructive';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-info/20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-info" />
          </div>
          <h2 className="text-elder-xl font-bold text-foreground">Symptom Journal</h2>
        </div>
        <Button
          variant="accent"
          size="lg"
          onClick={() => setShowAddSheet(true)}
          className="gap-2"
        >
          <Plus className="w-5 h-5" />
          Log
        </Button>
      </div>

      {/* Recent entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed border-border">
          <ThermometerSun className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg text-muted-foreground">No symptom entries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Tap "Log" to record how you're feeling</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <Card key={entry.id} className="p-4 border-2 border-border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getMoodIcon(entry.mood)}
                  <span className="font-semibold text-foreground capitalize">{entry.mood}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {entry.symptoms.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
                <Badge className={cn('text-xs', getSeverityColor(entry.severity))}>
                  {entry.severity}
                </Badge>
              </div>

              {entry.notes && (
                <p className="text-sm text-muted-foreground">{entry.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Entry Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-elder-xl">Log Symptoms</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-4 pb-6">
            {/* Mood */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">How are you feeling?</h3>
              <div className="flex gap-2">
                {MOOD_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setMood(option.value)}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                        mood === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      <Icon className={cn('w-8 h-8', option.color)} />
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Symptoms</h3>
              <div className="flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map(symptom => (
                  <button
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    className={cn(
                      'px-3 py-2 rounded-full text-sm font-medium border-2 transition-all',
                      selectedSymptoms.includes(symptom)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Severity</h3>
              <div className="flex gap-3">
                {(['mild', 'moderate', 'severe'] as Severity[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      'flex-1 py-3 rounded-xl border-2 font-semibold capitalize transition-all',
                      severity === s
                        ? s === 'mild' ? 'border-success bg-success/10 text-success'
                          : s === 'moderate' ? 'border-warning bg-warning/10 text-warning'
                          : 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Notes (optional)</h3>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional details about how you're feeling..."
                className="min-h-[80px]"
              />
            </div>

            {/* Save button */}
            <Button
              variant="accent"
              size="xl"
              onClick={handleSave}
              disabled={saving}
              className="w-full text-lg"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Plus className="w-5 h-5 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
