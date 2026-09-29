// The 話語甘霖 (daily verse) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BIBLE_LANGUAGE_OPTIONS, addDays, formatLocalDate, isEnglishBibleVersion, pickRandomVerse } from '../lib/bible.js';
import { DAILY_RAIN_DROPS } from '../player/rainConstants.js';
import { VerseSetContinuousRainPlayer } from '../player/VerseSetContinuousRainPlayer.jsx';
import { Volume2, XCircle } from 'lucide-react';
import { buildPublicShareUrl } from '../lib/routes.js';
import { initAudio } from '../lib/audio.js';
import { speakText } from '../lib/speech.js';

export default function DailyVersePage({ t, allSecondaryVerses, bilingualSecondaryVersion, challengeVerseFromReader, changeDailyVerseDate, creditListen, dailySecondaryVerseSet, dailySharedVoiceOwner, dailyVerseDate, displayedDailyVerse, favoriteVerseSets, handleVersionChange, openDailyPickerOnEnter, openListeningShare, openVoiceCommentsFromPlayer, personalCode, playerName, remoteDailyVerse, saveVoiceForVersion, selectedVoiceOptionId, setBilingualSecondaryVersion, setContinuousRainSet, setDailySharedVoiceOwner, setMainTab, setOpenDailyPickerOnEnter, setSelectedSetId, setShowLoginModal, setSpeechReady, setVoiceRefreshTick, speechReady, topicVerseSets, updateGarden, userEmail, version, voiceOptionsForVersion }) {
  return (
    !speechReady ? (
      <div className="continuous-rain-overlay">
        <button type="button" className="continuous-rain-stop" onClick={() => setMainTab('lobby')}>
          <XCircle size={24} /> {t('停止播放', 'Stop')}
        </button>
        <div className="daily-verse-rain-shell continuous-rain-shell" style={{ display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
          <div className="hud-glass" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2rem 1.8rem' }}>
            {/* Logo / Title */}
            <div style={{ marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.3rem' }}>🌧️</div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                {t('歡迎使用經文雨', 'Welcome to VerseRain')}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0.4rem 0 0 0' }}>
                {t('請先選擇語言和語音，再開始朗讀。', 'Choose your language and voice to begin.')}
              </p>
            </div>

            {/* Language Selector */}
            <div style={{ marginBottom: '1.1rem', textAlign: 'left' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                🌐 {t('語言', 'Language')}
              </label>
              <select
                value={version}
                onChange={(e) => handleVersionChange(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--control-font-family)' }}
              >
                {BIBLE_LANGUAGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Voice Selector */}
            <div style={{ marginBottom: '1.4rem', textAlign: 'left' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                🎙️ {t('語音', 'Voice')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedVoiceOptionId}
                  onChange={(e) => saveVoiceForVersion(e.target.value)}
                  style={{ flex: 1, padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--control-font-family)' }}
                >
                  <option value="">{t('系統預設語音', 'System Default')}</option>
                  {voiceOptionsForVersion.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => {
                    const lang = isEnglishBibleVersion(version) ? 'en-US' : version === 'ja' ? 'ja-JP' : version === 'ko' ? 'ko-KR' : version === 'fa' ? 'fa-IR' : version === 'he' ? 'he-IL' : version === 'es' ? 'es-ES' : version === 'tr' ? 'tr-TR' : version === 'de' ? 'de-DE' : version === 'my' ? 'my-MM' : 'zh-TW';
                    initAudio();
                    speakText(t('這是試聽。', 'This is a preview.'), 0.9, lang);
                  }}
                  style={{ background: '#334155', border: 'none', borderRadius: '10px', padding: '0.65rem 0.8rem', cursor: 'pointer', color: '#94a3b8', flexShrink: 0 }}
                  title={t('試聽', 'Preview')}
                >
                  <Volume2 size={18} />
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              type="button"
              className="rain-action-btn play-btn"
              style={{ width: '100%', fontSize: '1.05rem', padding: '0.85rem 1.5rem', borderRadius: '12px', justifyContent: 'center' }}
              onClick={() => {
                initAudio();
                setSpeechReady(true);
              }}
            >
              <Volume2 size={20} /> {t('開始朗讀每日經文', 'Start Daily Verse')}
            </button>
          </div>
        </div>
      </div>
    ) : displayedDailyVerse ? (
      <VerseSetContinuousRainPlayer
        verseSet={{
          id: `daily-${remoteDailyVerse?.date || dailyVerseDate}`,
          title: remoteDailyVerse?.date || dailyVerseDate,
          verses: [displayedDailyVerse],
          sharedVoiceOwner: dailySharedVoiceOwner
        }}
        secondaryVerseSet={dailySecondaryVerseSet}
        secondaryVersion={bilingualSecondaryVersion}
        onSecondaryVersionChange={setBilingualSecondaryVersion}
        allSecondaryVerses={allSecondaryVerses}
        startVerse={displayedDailyVerse}
        version={version}
        t={t}
        userEmail={userEmail}
        playerName={playerName}
        onRequestLogin={() => setShowLoginModal('login')}
        label={remoteDailyVerse?.date || dailyVerseDate}
        topicSets={topicVerseSets}
        favoriteVerseSets={favoriteVerseSets}
        autoOpenPicker={openDailyPickerOnEnter}
        onAutoPickerOpened={() => setOpenDailyPickerOnEnter(false)}
        onSelectDailyVerse={() => changeDailyVerseDate(() => formatLocalDate(new Date()))}
        showNav
        onPrevious={() => changeDailyVerseDate(prev => formatLocalDate(addDays(`${prev}T00:00:00`, -1)))}
        onNext={() => changeDailyVerseDate(prev => formatLocalDate(addDays(`${prev}T00:00:00`, 1)))}
        nextDisabled={dailyVerseDate >= formatLocalDate(new Date())}
        onStop={() => { setDailySharedVoiceOwner(null); setMainTab('lobby'); }}
        onSelectTopicSet={(set) => {
          setSelectedSetId(set.id);
          setMainTab('lobby');
          setContinuousRainSet({
            ...set,
            startVerse: pickRandomVerse(set.verses || [])
          });
        }}
        onListenLogged={(v) => { updateGarden('activity_only', 'listen'); creditListen(v); }}
        onOpenVoiceComments={openVoiceCommentsFromPlayer}
        onVoiceRecorded={() => setVoiceRefreshTick(x => x + 1)}
        onChallengeVerse={challengeVerseFromReader}
        onShareVerse={(verse, shareOpts) => {
          if (!verse) return;
          const dateLabel = remoteDailyVerse?.date || dailyVerseDate;
          const link = buildPublicShareUrl('/', {
    ref: personalCode,
            listenDaily: dateLabel,
            version,
            ...(shareOpts?.voiceOwner ? { vo: shareOpts.voiceOwner } : {}),
          });
          openListeningShare(link, `${dateLabel} · ${verse.reference}`);
        }}
      />
    ) : (
      <div className="continuous-rain-overlay">
        <button type="button" className="continuous-rain-stop" onClick={() => setMainTab('lobby')}>
          <XCircle size={24} /> {t('停止播放', 'Stop')}
        </button>
        <div className="daily-verse-rain-shell continuous-rain-shell">
          <div className="daily-verse-rain-scene continuous-rain-scene">
            <div className="daily-verse-rain-sky" />
            <div className="daily-verse-rain-glow" />
            <div className="daily-verse-rain-drops">
              {DAILY_RAIN_DROPS.map((drop, index) => (
                <span
                  key={index}
                  className={`depth-${drop.depth}`}
                  style={{
                    '--x': drop.left,
                    '--y': drop.top,
                    '--drop-length': drop.length,
                    '--drop-width': drop.width,
                    '--drop-opacity': drop.opacity,
                    '--drop-duration': drop.duration,
                    '--drop-delay': drop.delay,
                    '--drop-drift': drop.drift,
                    '--drop-blur': drop.blur
                  }}
                />
              ))}
            </div>
            <div className="daily-verse-rain-content continuous-rain-content">
              <div className="daily-verse-rain-topbar continuous-rain-topbar">
                <button type="button" onClick={() => changeDailyVerseDate(prev => formatLocalDate(addDays(`${prev}T00:00:00`, -1)))} aria-label={t('前一天', 'Previous day')}>‹</button>
                <div>
                  <div className="daily-verse-rain-date continuous-rain-set-title">{dailyVerseDate}</div>
                </div>
                <button
                  type="button"
                  onClick={() => changeDailyVerseDate(prev => formatLocalDate(addDays(`${prev}T00:00:00`, 1)))}
                  disabled={dailyVerseDate >= formatLocalDate(new Date())}
                  aria-label={t('後一天', 'Next day')}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
}
