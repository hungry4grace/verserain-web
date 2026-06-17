// Pure decision logic for the Voice Mode "read the block back after a correct
// recitation" feature. Kept separate from BlindModeGame.jsx so it can be unit
// tested without a DOM / SpeechRecognition / SpeechSynthesis environment.

// Given a matched block, decide what to read back and how to sequence it.
// Returns:
//   { text, shouldSpeak, muteRecognition, restartRecognitionAfter, advanceDelayMs }
//
// Invariants this encodes:
//  - We only speak when there's a TTS function AND non-empty text.
//  - While speaking we mute recognition so the system's own voice isn't
//    captured as user input (the mic-conflict guard).
//  - On the final block we keep recognition off and use the longer review delay
//    so the closing readback isn't cut short; otherwise we restart recognition
//    and advance quickly.
export function planReadback(block, { isFinalBlock, hasSpeakText, reviewMs, normalMs }) {
  const text = typeof block === 'string' ? block : (block && block.text) || '';
  const canSpeak = Boolean(hasSpeakText && text);
  const advanceDelayMs = isFinalBlock ? reviewMs : normalMs;
  return {
    text,
    shouldSpeak: canSpeak,
    muteRecognition: canSpeak,
    // After speaking, restart recognition only if the game isn't over.
    restartRecognitionAfter: canSpeak && !isFinalBlock,
    advanceDelayMs,
  };
}
