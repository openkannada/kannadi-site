// Voice typing with the browser's speech recognition in Kannada (kn-IN).
// Chrome and Edge send the audio to their speech service; the page itself
// makes no request.
import { S } from "./strings.ts";

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

/** Restarts in a row that each end in an error before listening gives up. */
const MAX_EMPTY = 3;
/** Errors after which listening again would fail the same way. */
const FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

export class Voice {
  private recognition: Recognition | null = null;
  /** The user asked to stop, or a fatal error happened: do not listen again on end. */
  private stopping = false;
  private error: string | undefined;
  /** Sessions in a row that ended without hearing anything; a few mean something is wrong. */
  private empty = 0;
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
    this.empty = 0;
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
      this.empty = 0;
      this.error = undefined;
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
      this.error = S.voice.errors[e.error] ?? S.voice.failed;
      if (FATAL.has(e.error)) this.stopping = true;
    };
    r.onend = () => {
      this.recognition = null;
      // Restart after a pause, but not forever: an error that keeps coming back stops listening.
      const again = !this.stopping && (!this.error || ++this.empty < MAX_EMPTY);
      if (again && this.listen()) return;
      this.events.onState(false, this.error);
    };
    try {
      r.start();
    } catch {
      this.error = S.voice.couldNotStart;
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
