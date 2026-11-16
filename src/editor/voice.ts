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
  /** Listening started or stopped; `error` is set when it stopped because of one. */
  onState: (listening: boolean, error?: string) => void;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Allow the microphone for this page to type by voice.",
  "service-not-allowed": "This browser does not allow voice typing here.",
  "audio-capture": "No microphone was found.",
  network: "Voice typing needs a connection to the browser's speech service.",
  "language-not-supported": "This browser cannot recognize Kannada speech.",
};
/** Errors after which listening again would fail the same way. */
const FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

export class Voice {
  private recognition: Recognition | null = null;
  /** The user asked to stop, or a fatal error happened: do not listen again on end. */
  private stopping = false;
  private error: string | undefined;
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
    this.stopping = false;
    this.error = undefined;
    if (this.listen()) this.events.onState(true);
    else this.events.onState(false, this.error);
  }

  /** Starts 1 recognition session; Chrome on Android ends each one after a pause. */
  private listen(): boolean {
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
      if (e.error === "no-speech" || e.error === "aborted") return;
      this.error = ERRORS[e.error] ?? "Voice typing stopped.";
      if (FATAL.has(e.error)) this.stopping = true;
    };
    r.onend = () => {
      this.recognition = null;
      if (!this.stopping && this.listen()) return;
      this.events.onState(false, this.error);
    };
    try {
      r.start();
    } catch {
      this.error = "Voice typing could not start.";
      return false;
    }
    this.recognition = r;
    return true;
  }

  stop(): void {
    this.stopping = true;
    this.recognition?.stop();
  }
}
