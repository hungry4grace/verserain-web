// Speech synthesis: voice picking and reading verses aloud — moved out of App.jsx (UI/UX 第 4 階段).
import { initialBibleVersion } from './routes.js';
import { toSpeechText } from './speechText.js';
import { voiceMatchesSavedKey } from './voicePicker.js';

// Per-language fallback voice-name patterns. When the system has no voice
// tagged with the right BCP-47 lang prefix, we'd rather pick a voice whose
// NAME identifies the right language than let the OS auto-pick (which on
// iOS/macOS often falls through to a phonetically-wrong voice — e.g. the
// Arabic "Maged" voice for Persian text because both use Arabic script).
export const VOICE_NAME_FALLBACKS = {
  fa: [/soraya/i, /dariush/i, /persian/i, /farsi/i],
  ar: [/maged/i, /majed/i, /tarik/i, /laila/i, /arabic/i],
};
// Languages we must NEVER cross-pollinate from in an emergency fallback.
// Persian and Arabic share script but their phonetics are completely
// different — picking a voice from the wrong language sounds wrong to
// native ears of either side.
export const VOICE_LANG_BLOCKLIST = {
  fa: ['ar'], // never pick Arabic for Persian
  ar: ['fa'], // never pick Persian for Arabic (reverse case)
};

export function pickSpeechVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  // Skip any voice flagged as broken this session (see markSuspectVoice) —
  // a corrupted OS voice can wedge Chrome's whole TTS engine.
  const voices = window.speechSynthesis.getVoices().filter(v => !isSuspectVoice(v));
  const langPrefix = String(lang || '').toLowerCase().split('-')[0];
  const isAllowed = (v) => {
    const vp = String(v.lang || '').toLowerCase().split('-')[0];
    const block = VOICE_LANG_BLOCKLIST[langPrefix] || [];
    return !block.includes(vp);
  };

  const byVersionRaw = localStorage.getItem('verseRain_voiceByVersion');
  let byVersion = {};
  try { byVersion = byVersionRaw ? JSON.parse(byVersionRaw) : {}; } catch (e) { byVersion = {}; }
  const activeVersion = initialBibleVersion();
  const savedVoiceKey = byVersion?.[activeVersion] || localStorage.getItem('verseRain_voiceName');
  if (savedVoiceKey) {
    // Match by stable voice identity (voiceURI). The picker now saves a
    // voiceId(); voiceMatchesSavedKey also accepts the legacy "name__lang"
    // form so previously-saved selections keep working. Using the unique
    // voiceURI is what fixes "picked a different same-named voice but the
    // sound never changed" on Android — name lookup always hit the first one.
    const exactByVersion = voices.find(v => voiceMatchesSavedKey(v, savedVoiceKey));
    // Only reuse the saved voice when its language matches the text being
    // spoken. The saved key is keyed to the app's ACTIVE version, but the
    // 雙語對調「朗讀第二語言」path calls this with the SECOND language's lang
    // while the active version is still the primary — without this guard we
    // handed e.g. a Chinese voice to Japanese text (iOS then read 日文 with a
    // 中文 voice, choppy). Normal playback is unaffected: there lang always
    // matches the active version's language, so this still returns the save.
    if (exactByVersion
        && String(exactByVersion.lang || '').toLowerCase().startsWith(langPrefix)
        && isAllowed(exactByVersion)) return exactByVersion;
    // Legacy name-only save (`verseRain_voiceName`) could be stale state
    // from a different Bible version → validate before using.
    const byName = voices.find(v => v.name === savedVoiceKey);
    if (byName && byName.lang?.toLowerCase().startsWith(langPrefix) && isAllowed(byName)) {
      return byName;
    }
  }

  // Standard lang-prefix match.
  const exact = voices.find(v => v.lang?.toLowerCase() === String(lang).toLowerCase() && isAllowed(v));
  if (exact) return exact;
  const prefix = voices.find(v => v.lang?.toLowerCase().startsWith(langPrefix) && isAllowed(v));
  if (prefix) return prefix;

  // Name-based fallback for languages where the OS often lacks a properly-
  // tagged voice (e.g. Persian on desktop Chrome, or iOS variants that
  // mistag Persian voices). If the voice's NAME identifies the language
  // explicitly (e.g. "Soraya"), trust it — bypass the blocklist, because
  // the name is more reliable than a possibly-stale lang tag.
  const patterns = VOICE_NAME_FALLBACKS[langPrefix];
  if (patterns) {
    const byName = voices.find(v => patterns.some(p => p.test(v.name || '')));
    if (byName) return byName;
  }

  // Last resort: null — utterance.lang stays set, but we leave utterance.voice
  // unset rather than risk auto-fallback to a blocklisted voice. Speech may
  // be silent on systems that need an explicit voice, but at least it won't
  // mispronounce.
  return null;
}

// ─── Broken-voice watchdog ────────────────────────────────────────────────
// Chrome on macOS can wedge on a corrupted system voice: speak() reports
// speaking=true but 'start' never fires, and every later utterance hangs
// too (only a full browser restart recovers). If a *custom* voice hasn't
// fired 'start' within this window, we cancel it, blacklist that voice for
// the session, and retry the same text with the browser's default voice.
export const VOICE_START_TIMEOUT_MS = 1200;

export function markSuspectVoice(voice) {
  try {
    if (voice?.voiceURI) sessionStorage.setItem('verseRain_suspect_voice', voice.voiceURI);
  } catch { /* storage unavailable */ }
}

export function isSuspectVoice(voice) {
  try {
    return !!voice?.voiceURI && sessionStorage.getItem('verseRain_suspect_voice') === voice.voiceURI;
  } catch { return false; }
}

// Cancel a stuck utterance and re-speak with the default voice. Returns the
// retry utterance so callers can re-wire their own event handlers.
// 長輩模式 reads a little slower. Set from App (elderMode); applies to every
// TTS utterance below (recorded human voices are untouched).
let SPEECH_RATE_SCALE = 1;
export function setSpeechRateScale(x) { SPEECH_RATE_SCALE = x > 0 ? x : 1; }

export function retryWithDefaultVoice(stuckUtterance, text, rate, lang) {
  markSuspectVoice(stuckUtterance.voice);
  stuckUtterance.onend = null;
  stuckUtterance.onerror = null;
  window.speechSynthesis.cancel();
  const retry = new SpeechSynthesisUtterance(toSpeechText(text, lang));
  retry.lang = lang;
  retry.rate = rate * SPEECH_RATE_SCALE;
  retry.volume = 1;
  window.__speech_utterances = window.__speech_utterances || [];
  window.__speech_utterances.push(retry);
  setTimeout(() => window.speechSynthesis.speak(retry), 100);
  return retry;
}

export function ensureSpeechVoices() {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    const finish = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
    setTimeout(finish, 900);
  });
}

export function estimateSpeechDuration(text, lang) {
  const value = String(text || '');
  const hasCjk = /[\u3400-\u9fff]/.test(value) || String(lang || '').startsWith('zh');
  const estimated = hasCjk ? value.length * 280 : value.length * 120;
  return Math.max(1800, Math.min(estimated + 2200, 30000));
}

export function speakTextTimed(text, rate = 1.0, lang = 'zh-TW', voiceOverride = null) {
  return new Promise(async resolve => {
    const startedAt = Date.now();
    const minHoldMs = Math.min(estimateSpeechDuration(text, lang), 2200);
    if (!('speechSynthesis' in window)) {
      setTimeout(resolve, minHoldMs);
      return;
    }

    await ensureSpeechVoices();
    const utterance = new SpeechSynthesisUtterance(toSpeechText(text, lang));
    utterance.lang = lang;
    utterance.rate = rate * SPEECH_RATE_SCALE;
    utterance.volume = 1;
    // An explicit voiceOverride (e.g. the 朗讀第二語言 picker) wins over the
    // per-version saved default; skip a suspect (session-blacklisted) override.
    const voice = (voiceOverride && !isSuspectVoice(voiceOverride)) ? voiceOverride : pickSpeechVoice(lang);
    if (voice) utterance.voice = voice;

    window.__speech_utterances = window.__speech_utterances || [];
    window.__speech_utterances.push(utterance);

    let resolved = false;
    let started = false;
    let ended = false;
    const safeResolve = () => {
      if (resolved) return;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minHoldMs) {
        setTimeout(safeResolve, minHoldMs - elapsed);
        return;
      }
      resolved = true;
      utterance.onend = null;
      utterance.onerror = null;
      const idx = window.__speech_utterances.indexOf(utterance);
      if (idx !== -1) window.__speech_utterances.splice(idx, 1);
      resolve();
    };

    utterance.onstart = () => { started = true; };
    utterance.onend = () => { ended = true; safeResolve(); };
    // Chrome may fire onerror immediately when audio is blocked.
    // Keep a human pace fallback instead of resolving instantly.
    utterance.onerror = () => {
      const fallbackMs = Math.min(estimateSpeechDuration(text, lang), 2800);
      setTimeout(safeResolve, fallbackMs);
    };
    // Broken-voice watchdog: custom voice queued but 'start' never fired →
    // blacklist it for the session and re-speak with the default voice.
    if (voice) {
      setTimeout(() => {
        if (started || ended || resolved) return;
        const retry = retryWithDefaultVoice(utterance, text, rate, lang);
        retry.onstart = () => { started = true; };
        retry.onend = () => { ended = true; safeResolve(); };
        retry.onerror = () => setTimeout(safeResolve, 1500);
      }, VOICE_START_TIMEOUT_MS + 50);
    }
    setTimeout(safeResolve, estimateSpeechDuration(text, lang));
    // If speech never starts, still wait a bit so blocks don't "speed-run".
    setTimeout(() => {
      if (!started && !ended) {
        setTimeout(safeResolve, Math.min(estimateSpeechDuration(text, lang), 2200));
      }
    }, 600);
    setTimeout(() => {
      window.speechSynthesis.resume?.();
      window.speechSynthesis.speak(utterance);
    }, 50);
  });
}

export function stopSpeechIfActive() {
  if (!('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text, rate = 1.0, lang = 'zh-TW') {
  return new Promise(async resolve => {
    if ('speechSynthesis' in window) {
      await ensureSpeechVoices();
      stopSpeechIfActive();

      const utterance = new SpeechSynthesisUtterance(toSpeechText(text, lang));
      utterance.lang = lang;
      utterance.rate = rate * SPEECH_RATE_SCALE;

      // Use user's preferred voice if set
      // Voice key is stored as "name__lang" format (e.g. "Meijia (Enhanced)__zh-TW")
      try {
        const voice = pickSpeechVoice(lang);
        if (voice) utterance.voice = voice;
      } catch (e) { /* localStorage unavailable */ }

      // Chrome GC bug workaround: keep a global reference to the utterance
      // so the garbage collector doesn't reap it before the audio finishes.
      window.__speech_utterances = window.__speech_utterances || [];
      window.__speech_utterances.push(utterance);

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          utterance.onend = null;
          utterance.onerror = null;
          const idx = window.__speech_utterances.indexOf(utterance);
          if (idx !== -1) window.__speech_utterances.splice(idx, 1);
          resolve();
        }
      };

      let started = false;
      utterance.onstart = () => { started = true; };
      utterance.onend = safeResolve;
      utterance.onerror = safeResolve;

      // Safety fallback — keep this generous so slower voices are not cut off early.
      const timeoutMs = Math.max(8000, Math.min(text.length * 500, 30000));
      setTimeout(safeResolve, timeoutMs);

      // Small delay to let iOS audio session settle after cancel(), then speak
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);

      // Broken-voice watchdog: custom voice queued but 'start' never fired →
      // blacklist it for the session and re-speak with the default voice.
      if (utterance.voice) {
        setTimeout(() => {
          if (started || resolved) return;
          const retry = retryWithDefaultVoice(utterance, text, rate, lang);
          retry.onstart = () => { started = true; };
          retry.onend = safeResolve;
          retry.onerror = safeResolve;
        }, VOICE_START_TIMEOUT_MS + 50);
      }
    } else {
      resolve();
    }
  });
}
