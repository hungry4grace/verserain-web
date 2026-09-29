// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Camera, XCircle } from 'lucide-react';
import { iosAppSupportsCamera, isInIosNativeApp } from '../lib/platform';
import { toast } from '../ui';
import QrScanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';

// ─── Google + Apple OAuth buttons ───────────────────────────────────────────
// We render our own styled buttons (instead of the GIS iframe button) because
// Google's renderButton iframe is unreliable on iOS Safari (ITP blocks the
// cross-origin frame and the button silently renders blank). Click flow:
//   Google web → google.accounts.oauth2.initTokenClient → popup → access_token
//   Google app → window.webkit.messageHandlers.googleSignIn → native
//                ASWebAuthenticationSession → access_token via JS callback
//   Apple      → window.AppleID.auth.signIn → popup → id_token
// We hand the credential up to the parent, which forwards it to the backend
// /oauth-login endpoint for verification.
// Modal for binding/recovering a referrer code. Two ways in:
//   • paste an invite URL or 10-char code into the text field, OR
//   • tap "📷 掃 QR" → camera preview → auto-detect QR → auto-fill.
// Either way the final save flow is identical (extract ref, validate,
// persist locally + push to PartyKit).
export function BindInviterModal({ t, personalCode, userEmail, setMyInviterCode, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [inputValue, setInputValue] = useState('');
  // Old App builds (< 3.7.0) crash on any getUserMedia call — see comment on
  // iosAppSupportsCamera() — so we render a "please use Safari" notice in
  // place of the scan button until the App Store rollout completes.
  const cameraDisabledInApp = isInIosNativeApp() && !iosAppSupportsCamera();

  // Stop and free the camera when the modal closes / unmounts.
  useEffect(() => {
    return () => {
      try { scannerRef.current?.stop(); scannerRef.current?.destroy(); } catch {}
      scannerRef.current = null;
    };
  }, []);

  const extractCode = (raw) => {
    let code = String(raw || '').trim();
    if (!code) return null;
    try {
      const parsed = new URL(code);
      const refParam = parsed.searchParams.get('ref');
      if (refParam) code = refParam;
    } catch { /* not a URL — assume bare code */ }
    return code.trim();
  };

  const persistAndClose = async (code) => {
    if (!/^[A-HJ-NP-Za-km-z2-9]{10}$/.test(code)) {
      toast.error(t('推薦碼格式不正確，應為 10 個字母/數字。', 'Invalid format. Expected 10 letters/numbers.'));
      return;
    }
    if (code === personalCode) {
      toast.error(t('不能填自己的推薦碼。', "You can't use your own code."));
      return;
    }
    localStorage.setItem('verserain_inviter', code);
    localStorage.removeItem('verserain_invite_claimed');
    setMyInviterCode(code);
    if (userEmail) {
      fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/bind-inviter", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, inviter: code }),
      }).catch(() => {});
    }
    onClose();
    toast.success(t('已綁定推薦人，下次過關會自動補上點數。', 'Referrer bound. Your next verse clear will credit both sides.'));
  };

  const startScan = async () => {
    setScanError('');
    setScanning(true);
    try {
      // qr-scanner needs the <video> element to exist; defer to next tick so
      // React has rendered the conditional preview block.
      await new Promise(r => setTimeout(r, 0));
      if (!videoRef.current) throw new Error('Video element not mounted');
      const cameras = await QrScanner.listCameras(true).catch(() => []);
      if (!cameras.length) {
        setScanError(t('找不到相機，請確認權限。', 'No camera found. Please check permissions.'));
        setScanning(false);
        return;
      }
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const data = typeof result === 'string' ? result : result?.data;
          const code = extractCode(data);
          if (code && /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(code)) {
            try { scanner.stop(); scanner.destroy(); } catch {}
            scannerRef.current = null;
            setScanning(false);
            setInputValue(code);
            persistAndClose(code);
          }
        },
        { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true }
      );
      scannerRef.current = scanner;
      await scanner.start();
    } catch (e) {
      console.error('QR scan failed', e);
      setScanError(
        e?.name === 'NotAllowedError'
          ? t('相機權限被拒絕，請改用手動輸入。', 'Camera permission denied. Please paste the code instead.')
          : t('無法啟動相機。請改用手動輸入。', 'Could not start camera. Please paste the code instead.')
      );
      setScanning(false);
      try { scannerRef.current?.destroy(); } catch {}
      scannerRef.current = null;
    }
  };

  const stopScan = () => {
    try { scannerRef.current?.stop(); scannerRef.current?.destroy(); } catch {}
    scannerRef.current = null;
    setScanning(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) { stopScan(); onClose(); } }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '1.6rem 1.4rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
            🤝 {t('補上推薦碼', 'Add My Referrer')}
          </h2>
          <button onClick={() => { stopScan(); onClose(); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><XCircle size={22} /></button>
        </div>
        <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
          {t('掃描推薦人的 QR Code，或貼上邀請連結／10 字元推薦碼。下次過關時雙方都會獲得獎勵。', "Scan your referrer's QR code, or paste their invite link / 10-char code. After your next verse clear, both of you will receive the reward.")}
        </p>

        {cameraDisabledInApp ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.88rem', lineHeight: 1.45, marginBottom: '0.9rem' }}>
            📱 {t('目前 App 版本不支援掃描，請在 Safari 開 verserain.com 掃描，或在下方手動貼上推薦碼。下次 App 更新後會自動可用。', 'This App version does not support scanning yet. Please open verserain.com in Safari to scan, or paste the code below. Scanning will work after the next App update.')}
          </div>
        ) : !scanning ? (
          <button
            type="button"
            onClick={startScan}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '0.98rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Camera size={18} /> {t('掃描 QR Code', 'Scan QR Code')}
          </button>
        ) : (
          <div style={{ marginBottom: '0.9rem' }}>
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />
            </div>
            <button
              type="button"
              onClick={stopScan}
              style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '10px', background: '#475569', color: '#fff', border: 'none', fontSize: '0.92rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.6rem' }}
            >
              {t('停止掃描', 'Stop scanning')}
            </button>
          </div>
        )}

        {scanError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '0.9rem' }}>
            {scanError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.78rem', margin: '0.4rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span>{t('或手動輸入', 'or paste')}</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('https://verserain.com/?ref=XXXXXXXXXX 或 XXXXXXXXXX', 'https://verserain.com/?ref=XXXXXXXXXX or XXXXXXXXXX')}
          style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '0.95rem', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => {
            stopScan();
            const code = extractCode(inputValue);
            if (code) persistAndClose(code);
          }}
          style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.8rem' }}
        >
          {t('儲存', 'Save')}
        </button>
      </div>
    </div>
  );
}
