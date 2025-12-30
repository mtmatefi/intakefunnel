import { useState, useRef, useCallback, useEffect } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export type VoiceAssistantState = 
  | 'idle'           // Not active
  | 'speaking'       // Reading question
  | 'listening'      // Listening to user
  | 'confirming'     // Asking if complete
  | 'processing';    // Processing answer

interface UseVoiceAssistantOptions {
  language: 'de' | 'en';
  onAnswerComplete: (answer: string) => void;
  silenceTimeout?: number; // ms before asking if complete
}

export function useVoiceAssistant({ 
  language, 
  onAnswerComplete,
  silenceTimeout = 2500 
}: UseVoiceAssistantOptions) {
  const [state, setState] = useState<VoiceAssistantState>('idle');
  const [isSupported, setIsSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullTranscriptRef = useRef('');
  const isActiveRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'de' ? 'de-DE' : 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update interim text for live display
      setInterimText(interimTranscript);

      if (finalTranscript) {
        // Append to full transcript
        fullTranscriptRef.current += (fullTranscriptRef.current ? ' ' : '') + finalTranscript.trim();
        setCurrentTranscript(fullTranscriptRef.current);
        setInterimText('');
        
        // Reset silence timer
        clearSilenceTimer();
        startSilenceTimer();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        stopAssistant();
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active
      if (isActiveRef.current && state === 'listening') {
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition restart failed');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      clearSilenceTimer();
    };
  }, [language]);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'de' ? 'de-DE' : 'en-US';
    }
  }, [language]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // User stopped speaking - ask if complete
      if (fullTranscriptRef.current.trim()) {
        askIfComplete();
      }
    }, silenceTimeout);
  }, [silenceTimeout, clearSilenceTimer]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const langCode = language === 'de' ? 'de' : 'en';
      const preferredVoice = voices.find(v => v.lang.startsWith(langCode) && v.localService);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setState('listening');
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  }, []);

  const askIfComplete = useCallback(async () => {
    stopListening();
    clearSilenceTimer();
    setState('confirming');
    
    const confirmQuestion = language === 'de' 
      ? 'Ist das alles, oder möchten Sie noch etwas hinzufügen?'
      : 'Is that all, or would you like to add something?';
    
    await speak(confirmQuestion);
    
    // Wait for user response
    startListening();
  }, [language, speak, startListening, stopListening, clearSilenceTimer]);

  const confirmAnswer = useCallback(async () => {
    stopListening();
    clearSilenceTimer();
    setState('processing');
    
    const answer = fullTranscriptRef.current.trim();
    if (answer) {
      onAnswerComplete(answer);
    }
    
    // Reset for next question
    fullTranscriptRef.current = '';
    setCurrentTranscript('');
    setInterimText('');
  }, [onAnswerComplete, stopListening, clearSilenceTimer]);

  const continueListening = useCallback(() => {
    setState('listening');
    startListening();
    startSilenceTimer();
  }, [startListening, startSilenceTimer]);

  // Start the assistant with a question
  const startWithQuestion = useCallback(async (questionText: string) => {
    if (!isSupported) return;
    
    isActiveRef.current = true;
    fullTranscriptRef.current = '';
    setCurrentTranscript('');
    setInterimText('');
    
    setState('speaking');
    await speak(questionText);
    
    setState('listening');
    startListening();
    startSilenceTimer();
  }, [isSupported, speak, startListening, startSilenceTimer]);

  const stopAssistant = useCallback(() => {
    isActiveRef.current = false;
    clearSilenceTimer();
    stopListening();
    window.speechSynthesis?.cancel();
    setState('idle');
    fullTranscriptRef.current = '';
    setCurrentTranscript('');
    setInterimText('');
  }, [stopListening, clearSilenceTimer]);

  // Handle confirmation responses
  const handleConfirmationResponse = useCallback(async (response: 'yes' | 'no' | 'add') => {
    if (response === 'yes' || response === 'add') {
      // User wants to add more
      continueListening();
    } else {
      // User confirmed they're done
      confirmAnswer();
    }
  }, [continueListening, confirmAnswer]);

  return {
    state,
    isSupported,
    currentTranscript,
    interimText,
    startWithQuestion,
    stopAssistant,
    confirmAnswer,
    continueListening,
    handleConfirmationResponse,
  };
}
