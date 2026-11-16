// Tests for voice typing with the browser's speech recognition: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { recognitionClass, Voice } from "../src/editor/voice.ts";

class FakeRecognition {
  static last;
  constructor() {
    FakeRecognition.last = this;
    this.started = false;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
}

const result = (text, isFinal) => ({ isFinal, 0: { transcript: text } });

test("speech recognition is found under either name, and its absence is null", () => {
  assert.equal(recognitionClass({ SpeechRecognition: FakeRecognition }), FakeRecognition);
  assert.equal(recognitionClass({ webkitSpeechRecognition: FakeRecognition }), FakeRecognition);
  assert.equal(recognitionClass({ webkitSpeechRecognition: "stub" }), null);
  assert.equal(recognitionClass({}), null);
});

test("voice typing listens in Kannada and hands over final and interim text", () => {
  const texts = [];
  const states = [];
  const voice = new Voice(FakeRecognition, {
    onText: (final, interim) => texts.push([final, interim]),
    onState: (s) => states.push(s),
    onError: () => assert.fail("no error expected"),
  });
  voice.toggle();
  const r = FakeRecognition.last;
  assert.equal(r.lang, "kn-IN");
  assert.ok(r.started && r.continuous && r.interimResults);
  assert.equal(voice.listening, true);
  r.onresult({ resultIndex: 0, results: [result("ನಮಸ್ಕಾರ", true), result("ಹೇಗ", false)] });
  r.onresult({ resultIndex: 1, results: [result("ನಮಸ್ಕಾರ", true), result("ಹೇಗಿದ್ದೀರಿ", true)] });
  assert.deepEqual(texts, [["ನಮಸ್ಕಾರ", "ಹೇಗ"], ["ಹೇಗಿದ್ದೀರಿ", ""]]);
  voice.toggle();
  assert.equal(voice.listening, false);
  assert.deepEqual(states, [true, false]);
});

test("errors become plain messages, and silence is not an error", () => {
  const errors = [];
  const voice = new Voice(FakeRecognition, { onText() {}, onState() {}, onError: (m) => errors.push(m) });
  voice.start();
  FakeRecognition.last.onerror({ error: "no-speech" });
  FakeRecognition.last.onerror({ error: "aborted" });
  FakeRecognition.last.onerror({ error: "not-allowed" });
  FakeRecognition.last.onerror({ error: "something-new" });
  assert.deepEqual(errors, ["Allow the microphone for this page to type by voice.", "Voice typing stopped."]);
});
