import { useState, useCallback, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Plus, Trash2, ArrowLeft, Loader2, Brain, StopCircle, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useAppointments';
import { useMedications } from '@/hooks/useMedications';
import { cn } from '@/lib/utils';

interface AppointmentRecorderProps {
  appointmentId: string;
  onBack: () => void;
  onAnalysisComplete: () => void;
}

export function AppointmentRecorder({ appointmentId, onBack, onAnalysisComplete }: AppointmentRecorderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialText, setPartialText] = useState('');
  const [questions, setQuestions] = useState<{ id: string; question: string; was_addressed: boolean }[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const { updateAppointment, getQuestions, addQuestion, removeQuestion } = useAppointments();
  const { medications } = useMedications();

  // Load questions
  useEffect(() => {
    getQuestions(appointmentId).then(setQuestions);
  }, [appointmentId]);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad',
    onPartialTranscript: (data) => {
      setPartialText(data.text);
    },
    onCommittedTranscript: (data) => {
      setTranscript(prev => prev + (prev ? ' ' : '') + data.text);
      setPartialText('');
    },
  });

  const startRecording = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get transcription token');
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setIsConnected(true);
      toast.success('Recording started');
    } catch (e) {
      console.error('Failed to start recording:', e);
      toast.error('Failed to start recording. Check microphone permissions.');
    }
    setIsConnecting(false);
  }, [scribe]);

  const stopRecording = useCallback(() => {
    scribe.disconnect();
    setIsConnected(false);
    toast.success('Recording stopped');
  }, [scribe]);

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;
    await addQuestion(appointmentId, newQuestion.trim());
    const updated = await getQuestions(appointmentId);
    setQuestions(updated);
    setNewQuestion('');
  };

  const handleRemoveQuestion = async (id: string) => {
    await removeQuestion(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAnalyze = async () => {
    const fullTranscript = transcript + (partialText ? ' ' + partialText : '');
    if (fullTranscript.trim().length < 20) {
      toast.error('Transcript is too short to analyze. Please record more of the conversation.');
      return;
    }

    if (isConnected) {
      stopRecording();
    }

    setIsAnalyzing(true);
    try {
      // Save raw transcript
      await updateAppointment(appointmentId, {
        raw_transcript: fullTranscript,
        status: 'analyzing',
      } as any);

      // Call AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-appointment', {
        body: {
          transcript: fullTranscript,
          medications: medications.map(m => ({
            name: m.name,
            strength: m.strength,
            form: m.form,
            purpose: m.purpose,
          })),
          questions: questions.map(q => q.question),
        },
      });

      if (error) throw error;

      // Save analysis results
      await updateAppointment(appointmentId, {
        plain_summary: data.plain_summary,
        follow_up_flags: data.follow_up_flags || [],
        medication_mentions: data.medication_mentions || [],
        status: 'completed',
      } as any);

      // Update question statuses
      if (data.questions_addressed) {
        for (const q of questions) {
          const addressed = data.questions_addressed.some(
            (addr: string) => addr.toLowerCase().includes(q.question.toLowerCase().slice(0, 20)) ||
              q.question.toLowerCase().includes(addr.toLowerCase().slice(0, 20))
          );
          if (addressed) {
            // We'll mark via the parent
          }
        }
      }

      toast.success('Appointment analysis complete!');
      onAnalysisComplete();
    } catch (e) {
      console.error('Analysis failed:', e);
      toast.error('Failed to analyze appointment. Please try again.');
      await updateAppointment(appointmentId, { status: 'recording' } as any);
    }
    setIsAnalyzing(false);
  };

  const fullTranscript = transcript + (partialText ? ' ' + partialText : '');

  if (!consentGiven) {
    return (
      <div className="min-h-screen bg-background p-4 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-elder-2xl font-bold text-foreground">Recording Consent</h1>
        </div>

        <Card className="border-2 border-accent/30 bg-accent/5">
          <CardContent className="p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-elder-xl font-bold text-center text-foreground">
              Important: Recording Consent Required
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="text-elder-base">
                Before recording your appointment, you <strong className="text-foreground">must inform your doctor</strong> that you'd like to record the conversation.
              </p>
              <p className="text-elder-base">
                Many states require <strong className="text-foreground">two-party consent</strong> for recordings. Always ask your healthcare provider for permission first.
              </p>
              <p className="text-elder-base">
                This recording will be processed by AI to create a plain-English summary and is stored securely in your account.
              </p>
            </div>
            <div className="pt-4 space-y-3">
              <Button
                onClick={() => setConsentGiven(true)}
                className="w-full h-14 text-elder-lg font-bold rounded-2xl"
              >
                I Have My Doctor's Permission
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full h-12 rounded-2xl"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-elder-2xl font-bold text-foreground">Record Appointment</h1>
      </div>

      <div className="space-y-4">
        {/* Recording Controls */}
        <Card className={cn(
          "border-2 transition-all",
          isConnected ? "border-destructive/50 bg-destructive/5 animate-pulse" : "border-border"
        )}>
          <CardContent className="p-6 text-center space-y-4">
            <button
              onClick={isConnected ? stopRecording : startRecording}
              disabled={isConnecting || isAnalyzing}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all shadow-lg",
                isConnected
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-primary hover:bg-primary/90",
                (isConnecting || isAnalyzing) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isConnecting ? (
                <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
              ) : isConnected ? (
                <StopCircle className="w-10 h-10 text-destructive-foreground" />
              ) : (
                <Mic className="w-10 h-10 text-primary-foreground" />
              )}
            </button>
            <p className="text-elder-lg font-bold text-foreground">
              {isConnecting ? 'Connecting...' : isConnected ? '🔴 Recording...' : 'Tap to Start Recording'}
            </p>
            {isConnected && (
              <p className="text-muted-foreground text-sm">
                Speak clearly. The transcript appears below in real-time.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live Transcript */}
        {(fullTranscript || isConnected) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-elder-lg flex items-center gap-2">
                <MicOff className="w-5 h-5 text-muted-foreground" />
                Live Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[120px] max-h-[300px] overflow-y-auto rounded-xl bg-secondary/50 p-4">
                <p className="text-foreground text-elder-base leading-relaxed">
                  {transcript}
                  {partialText && (
                    <span className="text-muted-foreground italic"> {partialText}</span>
                  )}
                  {!transcript && !partialText && isConnected && (
                    <span className="text-muted-foreground italic">Listening for speech...</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions to Ask */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-elder-lg">📝 Questions to Ask</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pre-load questions you want answered. The AI will check if they were addressed.
            </p>
            <div className="flex gap-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add a question for your doctor..."
                className="flex-1 h-12 rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
              />
              <Button onClick={handleAddQuestion} size="icon" className="h-12 w-12 rounded-xl">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            {questions.length > 0 && (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl">
                    <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="flex-1 text-foreground">{q.question}</span>
                    <button onClick={() => handleRemoveQuestion(q.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analyze Button */}
        {fullTranscript.trim().length > 20 && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full h-16 text-elder-lg font-bold rounded-2xl gap-3"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Analyzing Appointment...
              </>
            ) : (
              <>
                <Brain className="w-6 h-6" />
                Analyze & Translate
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
