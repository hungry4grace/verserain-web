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
//   onUpload   — async ({ blob, mime, dur }) => void; throw to show an error
//   onCancel   — close without saving
//   onDone     — called after a successful upload
export default function VerseVoiceRecorder({ t, reference, verseText, onUpload, onCancel, onDone }) {
  // 120s ≈ 360KB at 24kbps opus → ~4.8 of the 6 allowed upload chunks,
  // leaving headroom for VBR overshoot. Plenty for multi-verse ranges.
  const MAX_SECONDS = 120;
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

  const cleanupMedia = () => {
    clearInterval(timerRef.current);
    try { if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach(tr => tr.stop());
    streamRef.current = null;
    recorderRef.current = null;
    try { previewAudioRef.current?.pause(); } catch { /* noop */ }
    previewAudioRef.current = null;
    try { previewSrcRef.current?.stop(); } catch { /* noop */ }
    previewSrcRef.current = null;
    try { previewCtxRef.current?.close(); } catch { /* noop */ }
    previewCtxRef.current = null;
  };
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      streamRef.current = stream;
      const mime = pickMime();
      mimeRef.current = mime || 'audio/webm';
      // 48kbps opus ≈ transparent for speech; 120s ≈ 720KB raw (within the
      // backend's 12-chunk upload cap).
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 });
      const parts = [];
      rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
      rec.onstop = () => {
        blobRef.current = new Blob(parts, { type: mimeRef.current });
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

  // ── ✨ 美化人聲 (gentle warm reverb) ─────────────────────────────────
  // Preview plays through a live Web Audio chain (instant toggle); on save
  // the effect is BAKED into the uploaded blob so every player hears it
  // without any playback-side changes.
  const [beautify, setBeautify] = useState(true);
  const previewCtxRef = useRef(null);
  const previewSrcRef = useRef(null);
  const decodedBufRef = useRef(null);

  const makeImpulse = (ctx, seconds = 1.3, decay = 2.6) => {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(1, len, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    return buf;
  };

  // Wire src → destination with dry + (convolver reverb) wet paths.
  const connectChain = (ctx, src, destination, withReverb) => {
    if (!withReverb) { src.connect(destination); return; }
    const dry = ctx.createGain(); dry.gain.value = 0.85;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx);
    src.connect(dry); dry.connect(destination);
    src.connect(conv); conv.connect(wet); wet.connect(destination);
  };

  const stopPreview = () => {
    try { previewSrcRef.current?.stop(); } catch { /* noop */ }
    previewSrcRef.current = null;
    setPreviewPlaying(false);
  };

  const togglePreview = async () => {
    if (previewPlaying) { stopPreview(); return; }
    if (!blobRef.current) return;
    try {
      if (!previewCtxRef.current) previewCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = previewCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      if (!decodedBufRef.current) {
        decodedBufRef.current = await ctx.decodeAudioData(await blobRef.current.arrayBuffer());
      }
      const src = ctx.createBufferSource();
      src.buffer = decodedBufRef.current;
      connectChain(ctx, src, ctx.destination, beautify);
      src.onended = () => { if (previewSrcRef.current === src) { previewSrcRef.current = null; setPreviewPlaying(false); } };
      previewSrcRef.current = src;
      src.start();
      setPreviewPlaying(true);
    } catch { /* decode/play failed — noop */ }
  };

  // Bake the reverb into a fresh 48kbps opus blob (realtime re-encode:
  // takes about as long as the clip itself — the UI shows a processing state).
  const bakeBeautified = async () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const srcBuf = decodedBufRef.current || await ctx.decodeAudioData(await blobRef.current.arrayBuffer());
      const dest = ctx.createMediaStreamDestination();
      const src = ctx.createBufferSource();
      src.buffer = srcBuf;
      connectChain(ctx, src, dest, true);
      const mime = mimeRef.current || 'audio/webm';
      const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 48000 });
      const parts = [];
      rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
      const done = new Promise((resolve) => { rec.onstop = resolve; });
      rec.start();
      src.start();
      // Stop shortly after the source ends so the reverb tail is kept.
      src.onended = () => window.setTimeout(() => { try { rec.stop(); } catch { /* noop */ } }, 900);
      await done;
      return new Blob(parts, { type: mime });
    } finally {
      try { await ctx.close(); } catch { /* noop */ }
    }
  };

  const discardAndRerecord = () => {
    stopPreview();
    previewAudioRef.current = null;
    decodedBufRef.current = null;
    blobRef.current = null;
    setSeconds(0);
    secondsRef.current = 0;
    setPhase('idle');
  };

  const send = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    stopPreview();
    setError('');
    try {
      let finalBlob = blob;
      if (beautify) {
        setPhase('processing');
        finalBlob = await bakeBeautified();
      }
      setPhase('uploading');
      await onUpload({ blob: finalBlob, mime: mimeRef.current, dur: secondsRef.current + (beautify ? 1 : 0) });
      onDone?.();
    } catch (e) {
      setError(String(e.message || e));
      setPhase('preview');
    }
  };

  const timeLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const close = (phase === 'uploading' || phase === 'processing') ? () => {} : () => { cleanupMedia(); onCancel(); };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1400, padding: '1rem' }}
    >
      <div style={{ background: '#fff', borderRadius: 14, padding: '1.6rem 1.5rem', width: 'min(460px, 100%)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', borderLeft: '4px solid #16a34a', textAlign: 'center' }}>
        <h3 style={{ color: '#1e293b', marginTop: 0 }}>{t('用你的聲音錄這節', 'Record this verse in your voice')}</h3>
        <div style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.8rem', margin: '0 0 0.8rem', fontSize: '0.92rem', lineHeight: 1.7, color: '#334155' }}>
          {reference && <div style={{ fontWeight: 600, marginBottom: 4, color: '#3b82f6' }}>{reference}</div>}
          {verseText ? `「${verseText}」` : ''}
          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 6 }}>
            {t('照著唸就好。聽這個題庫的人會聽到你的聲音,而不是電腦語音 🎙️', 'Just read it aloud. Listeners will hear your voice instead of the computer voice 🎙️')}
          </div>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
          {t(`最長 ${MAX_SECONDS} 秒。重錄會取代舊錄音。`, `Up to ${MAX_SECONDS}s. Re-recording replaces the old one.`)}
        </div>

        {phase === 'idle' && (
          <button onClick={startRecording} style={{ width: 84, height: 84, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '1.6rem', boxShadow: '0 8px 24px rgba(220,38,38,0.4)' }} title={t('開始錄音', 'Start recording')}>
            🎙️
          </button>
        )}
        {phase === 'recording' && (
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.6rem' }}>● {timeLabel}</div>
            <button onClick={stopRecording} style={{ padding: '0.6rem 1.6rem', borderRadius: 10, border: 'none', background: '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
              ⏹ {t('停止', 'Stop')}
            </button>
          </div>
        )}
        {(phase === 'preview' || phase === 'uploading' || phase === 'processing') && (
          <div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '0.9rem', cursor: 'pointer', color: '#334155', fontSize: '0.9rem', background: beautify ? '#fdf4ff' : '#f8fafc', border: `1px solid ${beautify ? '#e9d5ff' : '#e2e8f0'}`, borderRadius: 999, padding: '0.4rem 0.9rem' }}>
              <input
                type="checkbox"
                checked={beautify}
                disabled={phase !== 'preview'}
                onChange={(e) => { setBeautify(e.target.checked); stopPreview(); }}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              ✨ {t('美化人聲(溫暖殘響)', 'Enhance voice (warm reverb)')}
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={togglePreview} disabled={phase !== 'preview'} style={{ padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}>
                {previewPlaying ? `⏸ ${t('停止', 'Stop')}` : `▶ ${t('試聽', 'Preview')} (${timeLabel})`}
              </button>
              <button onClick={discardAndRerecord} disabled={phase !== 'preview'} style={{ padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}>
                🎙️ {t('重錄', 'Re-record')}
              </button>
              <button onClick={send} disabled={phase !== 'preview'} style={{ padding: '0.55rem 1.4rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #34d399, #10b981)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                {phase === 'processing' ? `✨ ${t('美化處理中…', 'Enhancing…')}` : phase === 'uploading' ? t('上傳中…', 'Uploading…') : t('儲存錄音', 'Save recording')}
              </button>
            </div>
            {phase === 'processing' && (
              <div style={{ color: '#a855f7', fontSize: '0.82rem', marginTop: '0.6rem' }}>
                {t('處理時間約與錄音長度相同,請稍候…', 'Processing takes about as long as the clip — hang tight…')}
              </div>
            )}
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
