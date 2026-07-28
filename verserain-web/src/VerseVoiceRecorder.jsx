import { useEffect, useRef, useState } from 'react';

// Generic verse-voice recorder modal — used by the custom-set editor so a
// creator can read a verse in their own voice. Flow mirrors the Cloud
// Family voice recorder: tap record → mic permission → live timer
// (auto-stop at MAX_SECONDS) → preview → upload via the `onUpload` prop.
//
// Props:
//   t          — i18n helper (zh, en) => string
//   reference  — verse reference shown above the text
//   verseText  — the text the creator reads aloud
//   onUpload   — ({ blob, mime, dur, beautify, reference }) => void. Fire-and-
//                forget: the parent bakes the enhance effect + uploads in the
//                BACKGROUND so the creator can immediately record the next verse.
//   onCancel   — close without saving
//   onDone     — called right after handing the clip off (closes the modal)
export default function VerseVoiceRecorder({ t, reference, verseText, onUpload, onCancel, onDone }) {
  // No user-facing duration limit — long recordings are chunked
  // automatically at upload (backend allows ≈27 min). This ceiling is a
  // safety stop for a mic left running by accident, not a UX cap.
  const MAX_SECONDS = 20 * 60;
  const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const blobRef = useRef(null);
  const mimeRef = useRef('');
  const previewAudioRef = useRef(null);
  const secondsRef = useRef(0);

  // ─── Live input monitor ────────────────────────────────────────────────
  // Why this exists: a Mac whose Chrome input is pointed at a virtual device
  // (Zoom/Teams/BlackHole/Krisp) or whose OS input volume is at 0 hands us a
  // track of pure digital zeros. Recording, upload and playback all succeed —
  // the clip is simply silent, and nobody finds out until playback. The meter
  // makes a dead mic obvious while you're still recording, and the device name
  // tells you WHICH input is being used so a wrong one is a one-glance fix.
  const [level, setLevel] = useState(0);          // smoothed peak, 0..1
  const [deviceLabel, setDeviceLabel] = useState('');
  const [noSound, setNoSound] = useState(false);  // live: quiet for a while now
  const [wasSilent, setWasSilent] = useState(false); // whole take had no signal
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const sawSoundRef = useRef(false);
  const silentSinceRef = useRef(0);
  // ≈ -46 dBFS. A live mic's room tone clears this easily (autoGainControl is
  // on); a dead/virtual device sits at exactly 0.0, so this separates "quiet
  // room" from "no signal at all" without false alarms between phrases.
  const SILENCE_PEAK = 0.005;
  const SILENCE_MS = 2500;

  // ─── Input device picker ───────────────────────────────────────────────
  // Chrome keeps its OWN microphone choice, independent of the macOS "Sound →
  // Input" default. A Mac with audio-production gear installed can list a dozen
  // inputs, and Chrome quietly sticking on a virtual one (BlackHole, Zoom,
  // Pro Tools aggregate) records pure silence with nothing in the browser UI to
  // show it. This picker puts the choice where the problem is visible.
  const AUDIO_INPUT_KEY = 'verseRain_audioInputId';
  const [inputDevices, setInputDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(() => {
    try { return localStorage.getItem(AUDIO_INPUT_KEY) || ''; } catch { return ''; }
  });

  // Device LABELS stay blank until mic permission has been granted at least
  // once, so this is called again right after getUserMedia succeeds (and on
  // devicechange, for headsets plugged in mid-session).
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const all = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(all.filter(d => d.kind === 'audioinput' && d.label));
    } catch { /* enumeration is best-effort */ }
  };

  useEffect(() => {
    refreshDevices();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', refreshDevices);
    return () => md?.removeEventListener?.('devicechange', refreshDevices);
  }, []);

  const chooseDevice = (id) => {
    setDeviceId(id);
    try {
      if (id) localStorage.setItem(AUDIO_INPUT_KEY, id);
      else localStorage.removeItem(AUDIO_INPUT_KEY);
    } catch { /* private mode — the choice still holds for this session */ }
  };

  const stopMeter = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    try { audioCtxRef.current?.close(); } catch { /* already closed */ }
    audioCtxRef.current = null;
    setLevel(0);
  };

  const startMeter = (stream) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return; // meter is best-effort; recording works without it
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      ctx.resume?.().catch(() => {});
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      // Source → analyser ONLY. Never connect to ctx.destination: that would
      // pipe the mic straight back out of the speakers and howl.
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let smoothed = 0;
      silentSinceRef.current = Date.now();
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const a = Math.abs(buf[i]);
          if (a > peak) peak = a;
        }
        // Fast attack, slow release — tracks speech without strobing.
        smoothed = peak > smoothed ? peak : smoothed * 0.88;
        setLevel(smoothed);
        const now = Date.now();
        if (peak >= SILENCE_PEAK) {
          sawSoundRef.current = true;
          silentSinceRef.current = now;
          setNoSound(false);
        } else if (now - silentSinceRef.current > SILENCE_MS) {
          setNoSound(true);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* meter is best-effort — never block recording on it */ }
  };

  const cleanupMedia = () => {
    clearInterval(timerRef.current);
    stopMeter();
    try { if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach(tr => tr.stop());
    streamRef.current = null;
    recorderRef.current = null;
    try { previewAudioRef.current?.pause(); } catch { /* noop */ }
    previewAudioRef.current = null;
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
  };
  // Unmount cleanup only. cleanupMedia touches nothing but refs and stable
  // setters, so the mount-time closure stays correct for the component's whole
  // life — re-running this effect on every render would tear down a live
  // recording.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => cleanupMedia, []);

  const pickMime = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
      if (MediaRecorder.isTypeSupported?.(m)) return m;
    }
    return '';
  };

  const startRecording = async () => {
    setError('');
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(t('此瀏覽器不支援錄音。', 'This browser does not support recording.'));
      return;
    }
    try {
      // Explicit DSP constraints: browser-side noise suppression, echo
      // cancellation and auto gain make room recordings noticeably cleaner.
      const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
      if (deviceId) audio.deviceId = { exact: deviceId };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio });
      } catch (e) {
        // A remembered device can vanish (headset unplugged) or have its id
        // rotated by a permission reset. Fall back to the system default and
        // forget the stale pick rather than dead-ending on an error screen.
        if (deviceId && (e?.name === 'OverconstrainedError' || e?.name === 'NotFoundError')) {
          delete audio.deviceId;
          chooseDevice('');
          stream = await navigator.mediaDevices.getUserMedia({ audio });
        } else {
          throw e;
        }
      }
      streamRef.current = stream;
      const track = stream.getAudioTracks?.()[0];
      // Track labels are only populated once permission is granted — which it
      // just was, so this is the real OS device name ("MacBook Air Microphone",
      // "BlackHole 16ch", …). Re-enumerate now that labels are readable, and
      // point the dropdown at whatever we actually ended up with.
      setDeviceLabel(track?.label || '');
      refreshDevices();
      const actualId = track?.getSettings?.().deviceId;
      if (!deviceId && actualId) setDeviceId(actualId); // reflect, don't persist
      sawSoundRef.current = false;
      setNoSound(false);
      setWasSilent(false);
      startMeter(stream);
      const mime = pickMime();
      mimeRef.current = mime || 'audio/webm';
      // 48kbps opus ≈ transparent for speech. Length is unbounded — the
      // upload layer slices the blob into as many chunks as needed.
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 });
      const parts = [];
      rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
      rec.onstop = () => {
        blobRef.current = new Blob(parts, { type: mimeRef.current });
        stopMeter();
        setWasSilent(!sawSoundRef.current);
        streamRef.current?.getTracks().forEach(tr => tr.stop());
        streamRef.current = null;
        setPhase('preview');
      };
      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      secondsRef.current = 0;
      setPhase('recording');
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) stopRecording();
      }, 1000);
    } catch (e) {
      setError(
        e?.name === 'NotAllowedError'
          ? t('麥克風權限被拒絕。請在瀏覽器設定允許後重試。', 'Microphone permission denied. Please allow it and retry.')
          : t('無法啟動麥克風。', 'Could not start the microphone.')
      );
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    try { recorderRef.current?.stop(); } catch { /* noop */ }
  };

  // Preview plays through a plain <audio> element, NOT Web Audio: on iOS an
  // AudioContext is muted by the ringer/silent switch and decodeAudioData can
  // reject MediaRecorder's mp4 output — both made 試聽 silently do nothing.
  const previewUrlRef = useRef(null);

  const stopPreview = () => {
    try { previewAudioRef.current?.pause(); } catch { /* noop */ }
    previewAudioRef.current = null;
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setPreviewPlaying(false);
  };

  const togglePreview = async () => {
    if (previewPlaying) { stopPreview(); return; }
    if (!blobRef.current) return;
    try {
      const url = URL.createObjectURL(blobRef.current);
      previewUrlRef.current = url;
      const audio = new Audio(url);
      const clear = () => { if (previewAudioRef.current === audio) stopPreview(); };
      audio.onended = clear;
      audio.onerror = clear;
      previewAudioRef.current = audio;
      await audio.play();
      setPreviewPlaying(true);
    } catch { stopPreview(); }
  };

  const discardAndRerecord = () => {
    stopPreview();
    blobRef.current = null;
    setSeconds(0);
    secondsRef.current = 0;
    setNoSound(false);
    setWasSilent(false);
    sawSoundRef.current = false;
    setPhase('idle');
  };

  // Hand the RAW clip to the parent and close immediately — upload runs in
  // the background so the creator can move straight on to the next verse.
  // beautify: false — the EQ pass was dropped (subtle gain, realtime-slow bake).
  const send = () => {
    const blob = blobRef.current;
    if (!blob) return;
    stopPreview();
    onUpload({ blob, mime: mimeRef.current || 'audio/webm', dur: secondsRef.current, beautify: false, reference });
    onDone?.();
  };

  const timeLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const close = (phase === 'uploading' || phase === 'processing') ? () => {} : () => { cleanupMedia(); onCancel(); };

  // Linear amplitude → dBFS, then map -60..0 dB onto the bar. A dB scale is
  // what makes the meter feel right: on a linear one, normal speech barely
  // leaves the left edge.
  const meterPct = level > 0
    ? Math.max(0, Math.min(100, ((20 * Math.log10(level)) + 60) / 60 * 100))
    : 0;
  const meterColor = meterPct < 10 ? '#ef4444' : meterPct > 92 ? '#f59e0b' : '#16a34a';

  // Only offered once labels are readable (i.e. mic permission has been granted
  // at least once) — an unlabelled list of opaque device ids helps nobody.
  // Disabled mid-take: MediaRecorder is bound to the stream it was constructed
  // with, so switching would mean silently restarting the recording.
  const deviceSelect = (inputDevices.length > 1) && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 0.9rem', textAlign: 'left' }}>
      <span style={{ fontSize: '1.05rem' }} aria-hidden="true">🎤</span>
      <select
        aria-label={t('輸入裝置', 'Input device')}
        value={deviceId}
        disabled={phase !== 'idle' && phase !== 'preview'}
        onChange={(e) => chooseDevice(e.target.value)}
        style={{ flex: 1, minWidth: 0, padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '0.85rem' }}
      >
        {inputDevices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
        ))}
      </select>
    </div>
  );

  // Shown while recording (live bar) and in preview (device name only), so a
  // wrong input device is visible before AND after the take.
  const inputMonitor = (live) => (
    <div style={{ margin: '0 0 0.9rem' }}>
      {live && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.05rem' }} aria-hidden="true">🎤</span>
          <div style={{ flex: 1, height: 14, background: '#e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ width: `${meterPct}%`, height: '100%', background: meterColor, borderRadius: 7, transition: 'width 80ms linear' }} />
          </div>
        </div>
      )}
      {deviceLabel && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 5, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {live ? '' : '🎤 '}{deviceLabel}
        </div>
      )}
      {live && noSound && (
        <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, marginTop: 6, textAlign: 'left' }}>
          ⚠️ {t('偵測不到聲音，請檢查麥克風', 'No sound detected — check your microphone')}
        </div>
      )}
    </div>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1400, padding: '1rem' }}
    >
      <div style={{ background: '#fff', borderRadius: 14, padding: '1.6rem 1.5rem', width: 'min(460px, 100%)', maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', borderLeft: '4px solid #16a34a', textAlign: 'center' }}>
        <h3 style={{ color: '#1e293b', marginTop: 0 }}>{t('用你的聲音錄這節', 'Record this verse in your voice')}</h3>
        {/* Whole-chapter verses (e.g. Psalm 18) run thousands of chars —
            the text box scrolls on its own so the record/save controls
            below never get pushed off screen. */}
        {/* 1.38rem = reading-aloud size (+50% over the old 0.92rem body). */}
        <div style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.8rem', margin: '0 0 0.8rem', fontSize: '1.38rem', lineHeight: 1.7, color: '#334155', maxHeight: '38dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {reference && <div style={{ fontWeight: 600, marginBottom: 4, color: '#3b82f6', fontSize: '1.05rem' }}>{reference}</div>}
          {verseText ? t('「{verse}」', '“{verse}”').replace('{verse}', verseText) : ''}
          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 6 }}>
            {t('照著唸就好。聽這個題庫的人會聽到你的聲音,而不是電腦語音 🎙️', 'Just read it aloud. Listeners will hear your voice instead of the computer voice 🎙️')}
          </div>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
          {t('不限長度，長經文放心慢慢唸。重錄會取代舊錄音。', 'No length limit — take your time with long passages. Re-recording replaces the old one.')}
        </div>

        {phase === 'idle' && (
          <div>
            {deviceSelect}
            <button onClick={startRecording} style={{ width: 84, height: 84, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '1.6rem', boxShadow: '0 8px 24px rgba(220,38,38,0.4)' }} title={t('開始錄音', 'Start recording')}>
              🎙️
            </button>
          </div>
        )}
        {phase === 'recording' && (
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.6rem' }}>● {timeLabel}</div>
            {inputMonitor(true)}
            <button onClick={stopRecording} style={{ padding: '0.6rem 1.6rem', borderRadius: 10, border: 'none', background: '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
              ⏹ {t('停止', 'Stop')}
            </button>
          </div>
        )}
        {(phase === 'preview' || phase === 'uploading' || phase === 'processing') && (
          <div>
            {wasSilent && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.55rem 0.7rem', margin: '0 0 0.8rem', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}>
                ⚠️ {t('這段錄音幾乎沒有聲音，建議重錄', 'This recording is almost silent — consider re-recording')}
              </div>
            )}
            {/* The picker replaces the static label here: after a silent take
                the next thing you want is to switch device and hit 重錄. */}
            {deviceSelect || inputMonitor(false)}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={togglePreview} disabled={phase !== 'preview'} style={{ padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}>
                {previewPlaying ? `⏸ ${t('停止', 'Stop')}` : `▶ ${t('試聽', 'Preview')} (${timeLabel})`}
              </button>
              <button onClick={discardAndRerecord} disabled={phase !== 'preview'} style={{ padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}>
                🎙️ {t('重錄', 'Re-record')}
              </button>
              <button onClick={send} disabled={phase !== 'preview'} style={{ padding: '0.55rem 1.4rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #34d399, #10b981)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                {t('儲存錄音', 'Save recording')}
              </button>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.6rem' }}>
              {t('儲存後會在背景上傳,你可以直接錄下一節', 'Uploading runs in the background — go ahead and record the next verse')}
            </div>
          </div>
        )}

        {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.8rem' }}>{error}</div>}

        <div style={{ marginTop: '1rem' }}>
          <button onClick={close} disabled={phase === 'uploading'} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
            {t('取消', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
