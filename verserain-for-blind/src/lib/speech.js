// Audio helpers for the blind-first VerseRain: a small self-voicing TTS queue,
// voice selection, a success chime, and a thin Speech Recognition wrapper.
// Everything degrades gracefully when an API is missing.

const LANG = 'zh-TW';
const VOICE_KEY = 'vrb_voiceName';

let cachedVoices = [];

export function loadVoices() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const ready = window.speechSynthesis.getVoices();
    if (ready.length) {
      cachedVoices = ready;
      resolve(ready);
      return;
    }
    const onChange = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 800);
  });
}

// Chinese voices, Traditional/Taiwan first.
export function chineseVoices(voices = cachedVoices) {
  const zh = voices.filter((v) => /^zh/i.test(v.lang));
  return zh.sort((a, b) => {
    const score = (v) => (/zh[-_]?TW/i.test(v.lang) ? 0 : /zh[-_]?HK/i.test(v.lang) ? 1 : 2);
    return score(a) - score(b);
  });
}

export function savedVoiceName() {
  try {
    return localStorage.getItem(VOICE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedVoiceName(name) {
  try {
    localStorage.setItem(VOICE_KEY, name);
  } catch {
    /* ignore */
  }
}

function pickVoice() {
  const want = savedVoiceName();
  if (want) {
    const found = cachedVoices.find((v) => v.name === want);
    if (found) return found;
  }
  return chineseVoices()[0] || null;
}

export function supportsSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking() {
  if (supportsSpeech()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

// Speak a single utterance. Resolves when finished (or immediately if TTS is
// unavailable). Cancels anything currently speaking first.
export function speak(text, { rate = 0.92, interrupt = true } = {}) {
  return new Promise((resolve) => {
    if (!supportsSpeech() || !text) {
      resolve();
      return;
    }
    if (interrupt) stopSpeaking();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = LANG;
    u.rate = rate;
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang || LANG;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  });
}

// ---- Success chime (Web Audio, no asset needed) -------------------------

let audioCtx = null;
function ctx() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

export function playChime(kind = 'success') {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const now = ac.currentTime;
  const notes = kind === 'success' ? [523.25, 659.25, 783.99] : [392, 329.63];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.12;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// ---- Speech recognition (memorize check) --------------------------------

export function supportsRecognition() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = LANG;
  rec.continuous = true;
  rec.interimResults = true;
  return rec;
}

// ---- Match scoring (how close the spoken text is to the verse) -----------

function clean(text) {
  return String(text || '')
    .replace(/[^\w一-鿿]/g, '')
    .toLowerCase();
}

export function scoreMatch(target, heard) {
  const t = clean(target);
  const h = clean(heard);
  if (!t || !h) return 0;
  if (h.includes(t) || t.includes(h)) {
    return Math.min(100, Math.round((Math.min(t.length, h.length) / t.length) * 100));
  }
  let matched = 0;
  let cursor = 0;
  for (const ch of t) {
    const at = h.indexOf(ch, cursor);
    if (at !== -1) {
      matched += 1;
      cursor = at + 1;
    }
  }
  return Math.round((matched / t.length) * 100);
}

// Turn "約翰福音 3:16" into natural speech "約翰福音第3章16節".
export function referenceForSpeech(reference) {
  const m = String(reference || '').match(/^(.+?)\s*(\d+)(?::([\d,\s\-–]+))?$/);
  if (!m) return reference || '';
  const [, book, chapter, verses] = m;
  if (!verses) return `${book}第${chapter}章`;
  const spoken = verses.replace(/[-–]/g, '至').replace(/\s+/g, '');
  return `${book}第${chapter}章${spoken}節`;
}
