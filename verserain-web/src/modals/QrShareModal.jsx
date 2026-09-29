// Share by QR code — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Library, Share2, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { alertDialog, toast } from '../ui';

export default function QrShareModal({ t, qrShareModal, setQrShareModal }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) setQrShareModal(null); }}>
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '20px', padding: 'clamp(1.5rem, 4vw, 3rem)', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(59,130,246,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', border: '1px solid rgba(59,130,246,0.3)', animation: 'flashSuccess 0.4s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={20} color="#60a5fa" /> {t("掃描 QR 碼來挑戰！", "Scan to Challenge!")}
          </h3>
          <button onClick={() => setQrShareModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}><XCircle size={24} /></button>
        </div>

        <div style={{ color: '#fbbf24', fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 'bold', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Library size={22} /> {qrShareModal.reference}</span>
        </div>

        <canvas
          ref={(canvas) => {
            if (canvas && qrShareModal) {
              QRCode.toCanvas(canvas, qrShareModal.url, {
                width: Math.min(280, window.innerWidth - 120),
                margin: 2,
                color: { dark: '#1e293b', light: '#ffffff' }
              });
            }
          }}
          style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', background: '#fff', padding: '12px' }}
        />

        <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
          {t("讓大家掃描這個 QR 碼，一起來挑戰這段經文！", "Have everyone scan this QR code to challenge this verse together!")}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(qrShareModal.url);
                toast.success(t("分享連結已複製到剪貼簿！", "Share link copied!"));
              } catch (err) {
                alertDialog({ title: t('分享連結', 'Share link'), message: qrShareModal.url });
              }
            }}
            style={{ flex: 1, padding: '0.75rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.25)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Share2 size={15} /> {t("複製連結", "Copy Link")}</span>
          </button>
          <button
            onClick={() => setQrShareModal(null)}
            style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            {t("關閉", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
