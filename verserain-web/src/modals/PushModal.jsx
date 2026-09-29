// Daily-verse push notification settings — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BIBLE_LANGUAGE_OPTIONS } from '../lib/bible.js';
import { Volume2, XCircle } from 'lucide-react';
import { hasNativeDailyPush } from '../pushConfig';

export default function PushModal({ t, pushStatus, setShowPushModal, subscribeMorningPush, unsubscribeMorningPush, version }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowPushModal(false); }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '1.8rem 1.6rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>
            🌧️ {t('每日經文推播', 'Daily Verse Push')}
          </h2>
          <button onClick={() => setShowPushModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><XCircle size={22} /></button>
        </div>
        {pushStatus === 'unsupported' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '8px', fontSize: '0.92rem', lineHeight: 1.5 }}>
            {t('此瀏覽器不支援推播。請用桌面 Chrome / Edge / Firefox 或 Android Chrome 來啟用。', 'This browser does not support push. Please use desktop Chrome / Edge / Firefox or Android Chrome.')}
          </div>
        )}
        {pushStatus === 'needs-pwa' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '1rem', borderRadius: '8px', fontSize: '0.92rem', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 0.6rem 0', fontWeight: 'bold' }}>
              {t('iOS 需要先把 VerseRain 加到主畫面', 'On iOS, add VerseRain to your Home Screen first')}
            </p>
            <ol style={{ margin: '0 0 0.3rem 1rem', padding: 0 }}>
              <li>{t('用 Safari 打開 verserain.com（不要用 App）', 'Open verserain.com in Safari (not the App)')}</li>
              <li>{t('點下方分享圖示 → 加入主畫面', 'Tap Share → Add to Home Screen')}</li>
              <li>{t('從主畫面點 VerseRain icon 打開', 'Open VerseRain from the Home Screen icon')}</li>
              <li>{t('再回到這頁開啟推播', 'Come back here and turn on push')}</li>
            </ol>
          </div>
        )}
        {pushStatus === 'denied' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '8px', fontSize: '0.92rem', lineHeight: 1.5 }}>
            {hasNativeDailyPush()
              ? t('通知權限已關閉。請到 iPhone 設定 → VerseRain → 通知 → 允許通知，再回來重試。', 'Notifications are off. Please enable them in iPhone Settings → VerseRain → Notifications, then retry.')
              : t('瀏覽器已封鎖通知。請到網站設定 → 通知 → 允許，再回來重試。', 'Notifications are blocked. Please allow notifications in your browser site settings, then retry.')}
          </div>
        )}
        {(pushStatus === 'idle' || pushStatus === 'subscribed') && (
          <>
            <p style={{ margin: '0 0 1.2rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.55 }}>
              {t('開啟後，每天上午 7 點（你的時區）會收到當日 dailyverses.net 經文推播，點通知一鍵進入「聆聽」。', 'Once enabled, each morning at 7am (your timezone) you\'ll get a push of the day\'s verse from dailyverses.net. Tap to start listening.')}
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.9rem', fontSize: '0.85rem', color: '#475569', marginBottom: '1.2rem' }}>
              <strong>{t('時區', 'Timezone')}:</strong> {typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '—'}
              <br />
              <strong>{t('語言', 'Language')}:</strong> {BIBLE_LANGUAGE_OPTIONS.find(o => o.value === version)?.label || version}
            </div>
            {pushStatus === 'subscribed' ? (
              <button
                onClick={async () => { await unsubscribeMorningPush(); }}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {t('關閉推播', 'Disable Push')}
              </button>
            ) : (
              <button
                onClick={async () => { const ok = await subscribeMorningPush(); if (ok) setShowPushModal(false); }}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #34d399, #10b981)', color: '#fff', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <Volume2 size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                {t('開啟每日推播', 'Enable Daily Push')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
