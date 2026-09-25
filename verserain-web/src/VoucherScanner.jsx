import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, XCircle, Image as ImageIcon } from 'lucide-react';
import { extractVoucherCode } from './lib/voucherCode.js';

// Store-side voucher scanner (折扣券核銷): opens the back camera as soon as it
// mounts, decodes the voucher QR (#verify/<code>) and hands the 8-character
// code up through `onCode`. Falls back to picking a QR photo when the camera
// cannot start (permission denied, in-app browsers without camera access).
// The camera is released on close / unmount.
// `extract` / `title` / `hint` / `notMatchText` let other forms reuse the same
// scanner for a different QR (the merchant form scans a referral share code);
// the defaults keep the verify page unchanged.
export default function VoucherScanner({ t, onCode, onClose, cameraDisabled = false, extract = extractVoucherCode, title, hint, notMatchText }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const fileRef = useRef(null);
  const doneRef = useRef(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const heading = title || t('掃描 QR 折扣券', 'Scan the coupon QR');
  const notMatch = notMatchText || t('這不是折扣券的 QR', 'That is not a coupon QR');

  const stop = () => {
    try { scannerRef.current?.stop(); scannerRef.current?.destroy(); } catch { /* already stopped */ }
    scannerRef.current = null;
  };
  const handleDecoded = (data) => {
    const code = extract(data);
    if (!code) { setError(notMatch); return; }
    if (doneRef.current) return;
    doneRef.current = true;
    stop();
    onCode(code);
  };

  useEffect(() => {
    if (cameraDisabled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!videoRef.current) throw new Error('Video element not mounted');
        const cameras = await QrScanner.listCameras(true).catch(() => []);
        if (cancelled) return;
        if (!cameras.length) {
          setError(t('找不到相機，請確認權限。', 'No camera found. Please check permissions.'));
          return;
        }
        const scanner = new QrScanner(
          videoRef.current,
          (result) => handleDecoded(typeof result === 'string' ? result : result?.data),
          {
            preferredCamera: 'environment',
            // Scan the whole frame, not qr-scanner's default centre square: a
            // voucher held close fills the view and would otherwise be cropped.
            calculateScanRegion: (v) => {
              const w = v.videoWidth || 640; const h = v.videoHeight || 480;
              const scale = Math.min(1, 640 / Math.max(w, h));
              return { x: 0, y: 0, width: w, height: h, downScaledWidth: Math.round(w * scale), downScaledHeight: Math.round(h * scale) };
            },
            highlightScanRegion: false,
            highlightCodeOutline: true,
            maxScansPerSecond: 8,
          },
        );
        scannerRef.current = scanner;
        await scanner.start();
        if (cancelled) { stop(); return; }
        setLive(true);
      } catch (e) {
        if (cancelled) return;
        stop();
        setError(e?.name === 'NotAllowedError'
          ? t('相機權限被拒絕，請改用手動輸入。', 'Camera permission denied. Please paste the code instead.')
          : t('無法啟動相機。請改用手動輸入。', 'Could not start camera. Please paste the code instead.'));
      }
    })();
    return () => { cancelled = true; stop(); };
    // Runs once per open: the camera is tied to the modal's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const r = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      handleDecoded(r?.data);
    } catch {
      setError(notMatch);
    }
  };
  const close = () => { stop(); onClose(); };

  return (
    <div onClick={close} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }}>
      <div role="dialog" aria-label={heading} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '1.2rem 1.2rem 1rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} /> {heading}
          </h2>
          <button type="button" onClick={close} aria-label={t('關閉', 'Close')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><XCircle size={22} /></button>
        </div>
        {cameraDisabled ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.88rem', lineHeight: 1.45, marginBottom: '0.9rem' }}>
            📱 {t('目前 App 版本不支援掃描，請在 Safari 開 verserain.com 掃描，或在下方手動貼上推薦碼。下次 App 更新後會自動可用。', 'This App version does not support scanning yet. Open verserain.com in Safari to scan, or paste the code below. It will work automatically after the next App update.')}
          </div>
        ) : (
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '0.6rem' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />
            {!live && !error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', fontSize: '0.9rem' }}>{t('處理中…', 'Working…')}</div>
            )}
          </div>
        )}
        <p style={{ margin: '0 0 0.8rem', color: '#475569', fontSize: '0.85rem', lineHeight: 1.5 }}>
          {hint || t('對準顧客折扣券上的 QR，掃到會自動查詢。', 'Point the camera at the QR on the customer’s coupon; it is looked up automatically.')}
        </p>
        {error && (
          <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
            {error}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} data-testid="voucher-qr-file" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '0.65rem 0.8rem', borderRadius: '10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <ImageIcon size={16} /> {t('從相簿選 QR 圖片', 'Pick a QR image instead')}
          </button>
          <button type="button" onClick={close} style={{ flex: 1, padding: '0.65rem 0.8rem', borderRadius: '10px', background: '#475569', color: '#fff', border: 'none', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}>
            {t('或手動輸入', 'or paste')}
          </button>
        </div>
      </div>
    </div>
  );
}
