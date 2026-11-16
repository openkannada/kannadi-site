// Voice typing with the browser's speech recognition in Kannada (kn-IN).
// Chrome and Edge send the audio to their speech service; the page itself
// makes no request.

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionConstructor = new () => Recognition;

/** The browser's speech recognition, or null where there is none. */
export function recognitionClass(w: object = globalThis): RecognitionConstructor | null {
  const g = w as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  const C = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  return typeof C === "function" ? (C as RecognitionConstructor) : null;
}

export interface VoiceEvents {
  /** Final text to insert, and the words still being heard. */
  onText: (final: string, interim: string) => void;
  onState: (listening: boolean) => void;
  onError: (message: string) => void;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Allow the microphone for this page to type by voice.",
  "service-not-allowed": "This browser does not allow voice typing here.",
  "audio-capture": "No microphone was found.",
  network: "Voice typing needs a connection to the browser's speech service.",
  "language-not-supported": "This browser cannot recognize Kannada speech.",
};

export class Voice {
  private recognition: Recognition | null = null;
  private readonly Recognition: RecognitionConstructor;
  private readonly events: VoiceEvents;

  constructor(Recognition: RecognitionConstructor, events: VoiceEvents) {
    this.Recognition = Recognition;
    this.events = events;
  }

  get listening(): boolean {
    return this.recognition !== null;
  }

  toggle(): void {
    if (this.recognition) this.stop();
    else this.start();
  }

  start(): void {
    const r = new this.Recognition();
    r.lang = "kn-IN";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]!;
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      this.events.onText(final, interim);
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") this.events.onError(ERRORS[e.error] ?? "Voice typing stopped.");
    };
    r.onend = () => {
      this.recognition = null;
      this.events.onState(false);
    };
    this.recognition = r;
    r.start();
    this.events.onState(true);
  }

  stop(): void {
    this.recognition?.stop();
  }
}
