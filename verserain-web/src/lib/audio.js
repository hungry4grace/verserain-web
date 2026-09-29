// Web Audio: background music and sound effects — moved out of App.jsx (UI/UX 第 4 階段).

let audioCtx = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  // iOS Safari requires SpeechSynthesis to be touched directly in user event.
  // ONLY do this on iOS: on desktop Chrome the user click already grants
  // activation, and this dummy utterance gets cancel()ed by the next real
  // speak before it ever starts — cancelling a not-yet-started utterance
  // DEADLOCKS Chrome's macOS TTS engine (speak() reports speaking=true
  // forever, no audio, until a full browser restart).
  if ('speechSynthesis' in window && !window.__speechUnlocked) {
    window.__speechUnlocked = true;
    const iosLike = /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
      || (/Macintosh/i.test(navigator.userAgent || '') && 'ontouchend' in document);
    if (iosLike) {
      const dummy = new SpeechSynthesisUtterance(' ');
      dummy.volume = 0;
      dummy.rate = 2; // finish fast
      window.speechSynthesis.speak(dummy);
    }
  }
}

// iPadOS 13+ reports a desktop "Macintosh" UA but has a touch screen.
export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

// Start looping background music at a given 0–1 volume.
// iOS Safari IGNORES HTMLMediaElement.volume (it's pinned to 1.0), so a custom
// per-set music level plays at full blast on iPhone/iPad. On iOS we therefore
// route the element through a Web Audio GainNode, which DOES honour the level.
// On desktop plain `.volume` works and avoids any suspended-AudioContext
// silence risk, so we keep it there. Returns the <audio> element; a
// `_bgmDisconnect()` is attached for graph teardown on cleanup.
// Editor slider ↔ stored gain. Loudness is logarithmic, so a linear slider makes
// 5% still sound loud against a quiet voice recording; a squared curve gives the
// bottom of the slider real headroom (10% → 0.01 gain ≈ −40 dB). The stored
// bgMusicVolume stays a plain 0–1 gain, so existing sets sound exactly as before.
export const bgmSliderToGain = (pct) => Math.pow(Math.max(0, Math.min(100, pct)) / 100, 2);

// Built-in background music. A set's bgMusic is '' (author never chose →
// shuffle all tracks), 'preset:random' (chose shuffle), 'preset:<id>' (bound
// to one track), 'none', or 'custom:<assetId>'. /bgm.mp3 stays the first
// track so the lobby player and older cached bundles keep working. All
// three are mastered to −24 LUFS.
export const PRESET_BGM = [
  { id: 'deer', file: '/bgm.mp3', label: 'As the Deer 如鹿切慕溪水' },
  { id: 'healing', file: '/bgm/healing.mp3', label: 'Healing 醫治' },
  { id: 'rest', file: '/bgm/rest.mp3', label: 'Rest 安息' },
];
export const PRESET_BGM_RANDOM = { id: 'random', file: null, label: '' };
// Menu entry / label for a choice: a real track, or the shuffle marker.
export const presetBgmFor = (choice) => {
  const s = String(choice || '');
  const id = s.startsWith('preset:') ? s.slice('preset:'.length) : '';
  return PRESET_BGM.find(p => p.id === id) || PRESET_BGM_RANDOM;
};
// The file to play for a choice: the bound track, or a random one.
export const pickPresetBgmFile = (choice) => {
  const p = presetBgmFor(choice);
  return p.file || PRESET_BGM[Math.floor(Math.random() * PRESET_BGM.length)].file;
};
export const isPresetBgm = (choice) => {
  const s = String(choice || '');
  return !s || s.startsWith('preset:');
};
export const bgmGainToSlider = (gain) => Math.round(Math.sqrt(Math.max(0, Math.min(1, gain ?? 0.18))) * 100);

export function startLoopingBgm(src, volume) {
  const audio = new Audio(src);
  audio.loop = true;
  // No floor: the editor slider is perceptual (see bgmSliderToGain), so tiny
  // gains like 0.001 are legitimate "barely there" settings.
  const clamp = (v) => Math.min(1, Math.max(0, v ?? 0.18));
  const vol = clamp(volume);
  let gain = null;
  if (isIOSDevice()) {
    try {
      initAudio(); // ensures the shared AudioContext exists + is resumed
      if (audioCtx) {
        const source = audioCtx.createMediaElementSource(audio);
        gain = audioCtx.createGain();
        gain.gain.value = vol;
        source.connect(gain).connect(audioCtx.destination);
        audio._bgmDisconnect = () => {
          try { source.disconnect(); } catch { /* already gone */ }
          try { gain.disconnect(); } catch { /* already gone */ }
        };
      } else {
        audio.volume = vol;
      }
    } catch {
      gain = null;
      audio.volume = vol; // MediaElementSource unavailable — best effort
    }
  } else {
    audio.volume = vol;
  }
  // Live volume updates (e.g. the editor slider): go through the gain node on
  // iOS, else the element's own volume.
  audio._bgmSetVolume = (v) => {
    const nv = clamp(v);
    if (gain) gain.gain.value = nv; else audio.volume = nv;
  };
  audio.play().catch(() => { /* caller retries / autoplay gate */ });
  return audio;
}

export function playShuffleSound() {
  initAudio();
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    }, i * 35);
  }
}

export function playBong() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(250, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

export function playThunder(type = 'light') {
  initAudio();
  const isHeavy = type === 'heavy';
  const duration = isHeavy ? 4.0 : 1.5;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate brown noise
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = data[i];
    data[i] *= 4.0;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(isHeavy ? 300 : 500, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(isHeavy ? 1.5 : 0.6, audioCtx.currentTime + 0.1);
  if (isHeavy) {
    gain.gain.setValueAtTime(1.5, audioCtx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(1.2, audioCtx.currentTime + 0.7);
  }
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noiseSource.start();
}

export function playTada() {
  initAudio();
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 Arpeggio
  let startTime = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, startTime + i * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + i * 0.15 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.15 + 0.6);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(startTime + i * 0.15);
    osc.stop(startTime + i * 0.15 + 0.6);
  });
}

// 地圖即時脈動的交響音效:每種動作一種樂器,全取自五聲音階(pentatonic),
// 所以多人同時活動、聲音疊在一起也永遠和諧、悅耳。複用共享 audioCtx。
export const PENTA_MID = [523.25, 587.33, 659.25, 783.99, 880.00];     // C5 D5 E5 G5 A5
export const PENTA_HI  = [880.00, 1046.50, 1174.66, 1318.51, 1567.98]; // A5 C6 D6 E6 G6
let __lastPulseToneTs = 0;
export function playPulseTone(action) {
  initAudio();
  if (!audioCtx || audioCtx.state === 'suspended') return; // 未解鎖前靜默
  const wall = Date.now();
  if (wall - __lastPulseToneTs < 80 && action !== 'done' && action !== 'fruit') return; // 節流(done/fruit 高潮不受限)
  __lastPulseToneTs = wall;
  const now = audioCtx.currentTime;
  const voice = (freq, t0, dur, type, peak) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  if (action === 'listen') {          // 聆聽 — 柔和高音鈴(celesta)
    const f = pick(PENTA_HI);
    voice(f, now, 0.9, 'sine', 0.10);
    voice(f * 2, now, 0.5, 'sine', 0.03);   // shimmer 高八度
  } else if (action === 'play') {     // 開始挑戰 — 溫暖木琴(marimba)
    const f = pick(PENTA_MID);
    voice(f, now, 0.55, 'triangle', 0.14);
    voice(f / 2, now, 0.4, 'sine', 0.04);   // 低八度琴身
  } else if (action === 'fruit') {    // 創新高 / 得新果子 — 喜慶的鼓聲(taiko)
    playPulseDrum(now);
  } else {                            // 完成 — 上行豎琴琶音(高潮)
    const i = (Math.random() * 3) | 0;
    const seq = [PENTA_MID[i], PENTA_MID[i + 1], PENTA_MID[i + 2] || PENTA_HI[1]];
    seq.forEach((fr, k) => {
      voice(fr, now + k * 0.075, 0.6, 'triangle', 0.12);
      voice(fr * 2, now + k * 0.075, 0.35, 'sine', 0.03);
    });
  }
}

// 一記結實的太鼓:低頻下沉的鼓身 + 短促打擊噪音,配合鼓面漣漪,
// 標記「有人在某節經文創新高、結出新果子」。
export function playPulseDrum(now) {
  if (!audioCtx) return;
  const t0 = now;
  // 鼓身:pitch 由 180Hz 快速下沉到 55Hz
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.18);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.34, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.38);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.45);
  // 打擊瞬態:短暫的低通噪音,給鼓「啪」的一下
  try {
    const len = Math.floor(audioCtx.sampleRate * 0.05);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;
    const nf = audioCtx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 1400;
    const ng = audioCtx.createGain();
    ng.gain.value = 0.14;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(audioCtx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.05);
  } catch {}
}

// 地圖:有新朋友加入時播放歡迎小號。走共享 audioCtx(解碼成 AudioBuffer 快取一次),
// 這樣在 iOS「🔊 開啟聲音」手勢解鎖後,之後(非手勢)也能播放。
let __welcomeBuffer = null;
let __welcomeLoading = null;
let __lastWelcomeTs = 0;
export function playWelcomeFanfare() {
  initAudio();
  if (!audioCtx || audioCtx.state === 'suspended') return; // 未解鎖前不播
  const now = Date.now();
  if (now - __lastWelcomeTs < 15000) return; // 節流:15 秒內最多一次,避免洗版
  const playBuf = () => {
    if (!__welcomeBuffer || !audioCtx) return;
    try {
      __lastWelcomeTs = Date.now();
      const src = audioCtx.createBufferSource();
      src.buffer = __welcomeBuffer;
      const g = audioCtx.createGain();
      g.gain.value = 0.55;
      src.connect(g);
      g.connect(audioCtx.destination);
      src.start();
    } catch {}
  };
  if (__welcomeBuffer) { playBuf(); return; }
  if (!__welcomeLoading) {
    __welcomeLoading = fetch('/welcome-fanfare.mp3')
      .then(r => r.arrayBuffer())
      .then(ab => new Promise((res, rej) => audioCtx.decodeAudioData(ab, res, rej)))
      .then(buf => { __welcomeBuffer = buf; return buf; })
      .catch(() => { __welcomeLoading = null; return null; });
  }
  __welcomeLoading.then(buf => { if (buf) playBuf(); });
}

export function playFireworksSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(Math.random() * 200 + 100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.5);
}

