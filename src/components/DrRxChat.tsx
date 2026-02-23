import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import drRxAvatar from '@/assets/dr-rx-avatar.png';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dr-rx-chat`;

const QUICK_QUESTIONS = [
  'What are common side effects of Metformin?',
  'Can I take ibuprofen with blood thinners?',
  'How should I store my medications?',
  'What happens if I miss a dose?',
];

interface DrRxChatProps {
  onBack: () => void;
}

export function DrRxChat({ onBack }: DrRxChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [medications, setMedications] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIndexRef = useRef(-1);

  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speakText = useCallback((text: string) => {
    if (!ttsSupported || !ttsEnabled) return;
    // Strip markdown formatting for cleaner speech
    const clean = text
      .replace(/[#*_~`>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, ttsSupported]);

  const stopSpeaking = useCallback(() => {
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [ttsSupported]);

  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Fetch user's current medications
  useEffect(() => {
    const fetchMeds = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('medications')
        .select('name, strength, form, purpose, instructions, generic_name')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (data) setMedications(data);
    };
    fetchMeds();
  }, []);

  // Auto-speak completed assistant responses
  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];
    if (lastMsg.role === 'assistant' && lastIndex > lastSpokenIndexRef.current) {
      lastSpokenIndexRef.current = lastIndex;
      speakText(lastMsg.content);
    }
  }, [isLoading, messages, speakText]);

  // Stop speaking on unmount
  useEffect(() => {
    return () => { stopSpeaking(); };
  }, [stopSpeaking]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, medications }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Dr. Rx is unavailable right now.' }));
        toast.error(errData.error || 'Something went wrong');
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* ignore partial leftovers */ }
        }
      }
    } catch (e) {
      console.error('Dr. Rx chat error:', e);
      toast.error('Failed to reach Dr. Rx. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in your browser settings.');
      }
    };

    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <img src={drRxAvatar} alt="Dr. Rx" className="w-10 h-10 rounded-full border-2 border-primary" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground leading-tight">Dr. Rx</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            AI Medication Assistant
          </p>
        </div>
        {ttsSupported && (
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl shrink-0 ${isSpeaking ? 'text-primary animate-pulse' : ''}`}
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setTtsEnabled(prev => !prev);
            }}
            title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        )}
        <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full font-medium">Online</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <img src={drRxAvatar} alt="Dr. Rx" className="w-9 h-9 rounded-full border border-primary shrink-0 mt-1" />
              <div className="bg-card border border-border rounded-2xl rounded-tl-md p-4 max-w-[85%] shadow-sm">
                <p className="text-foreground font-medium mb-2">Hi there! 👋 I'm Dr. Rx</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  I'm your AI medication assistant. Ask me anything about your medications — side effects, interactions, how they work, storage tips, and more.
                </p>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  ⚠️ I provide general information only. Always consult your doctor or pharmacist for medical advice.
                </p>
              </div>
            </div>

            {/* Quick questions */}
            <div className="pl-12 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm bg-primary/10 text-primary px-3 py-2 rounded-xl hover:bg-primary/20 transition-colors border border-primary/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <img src={drRxAvatar} alt="Dr. Rx" className="w-9 h-9 rounded-full border border-primary shrink-0 mt-1" />
            )}
            <div
              className={`rounded-2xl p-4 max-w-[85%] shadow-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-md'
                  : 'bg-card border border-border rounded-tl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <img src={drRxAvatar} alt="Dr. Rx" className="w-9 h-9 rounded-full border border-primary shrink-0 mt-1" />
            <div className="bg-card border border-border rounded-2xl rounded-tl-md p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Dr. Rx is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 pb-safe">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            placeholder={isListening ? "Listening..." : "Ask Dr. Rx about your medications..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className={`h-12 rounded-xl text-base flex-1 ${isListening ? 'border-destructive ring-1 ring-destructive' : ''}`}
          />
          {speechSupported && (
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className="h-12 w-12 rounded-xl shrink-0"
              onClick={toggleListening}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}
          <Button
            type="submit"
            variant="accent"
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
