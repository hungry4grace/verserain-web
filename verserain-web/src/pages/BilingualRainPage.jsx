// The 雙語朗讀 (bilingual rain) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BIBLE_LANGUAGE_OPTIONS, pickRandomVerse } from '../lib/bible.js';
import { CloudRain, Play } from 'lucide-react';
import { VerseSetContinuousRainPlayer } from '../player/VerseSetContinuousRainPlayer.jsx';
import { buildPublicShareUrl } from '../lib/routes.js';
import { initAudio } from '../lib/audio.js';

export default function BilingualRainPage({ t, allSecondaryVerses, bilingualRainActive, bilingualSecondaryVersion, challengeVerseFromReader, creditListen, favoriteVerseSetIdSet, favoriteVerseSets, handleVersionChange, openListeningShare, openVoiceCommentsFromPlayer, personalCode, playerName, preferredRainSet, pushSetForSharing, secondaryRainSet, setBilingualRainActive, setBilingualSecondaryVersion, setContinuousRainSet, setMainTab, setSelectedSetId, setSpeechReady, setVoiceRefreshTick, toggleFavoriteVerseSet, topicVerseSets, updateGarden, userEmail, version }) {
  return (
    bilingualRainActive && preferredRainSet ? (
      <VerseSetContinuousRainPlayer
        verseSet={preferredRainSet}
        secondaryVerseSet={secondaryRainSet}
        version={version}
        secondaryVersion={bilingualSecondaryVersion}
        onSecondaryVersionChange={setBilingualSecondaryVersion}
        allSecondaryVerses={allSecondaryVerses}
        t={t}
        userEmail={userEmail}
        playerName={playerName}
        label={t('雙語經文雨 Beta', 'Bilingual VerseRain Beta')}
        topicSets={topicVerseSets}
        favoriteVerseSets={favoriteVerseSets}
        showNav
        isFavoriteSet={favoriteVerseSetIdSet.has(preferredRainSet.voiceSetId || preferredRainSet.id)}
        onToggleFavoriteSet={() => toggleFavoriteVerseSet(preferredRainSet.voiceSetId || preferredRainSet.id)}
        onSelectDailyVerse={() => { setBilingualRainActive(false); setMainTab('daily_verse'); }}
        onStop={() => {
          setBilingualRainActive(false);
          setMainTab('advanced');
        }}
        onSelectTopicSet={(set) => {
          setSelectedSetId(set.id);
          setBilingualRainActive(false);
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
          pushSetForSharing(preferredRainSet, true);
          const verseIdx = (preferredRainSet.verses || []).findIndex(v => v?.reference === verse.reference);
          const link = buildPublicShareUrl('/lc', {
    ref: personalCode,
            set: preferredRainSet.id,
            ...(verseIdx >= 0 ? { i: verseIdx } : { verse: verse.reference }),
            ...(shareOpts?.voiceOwner ? { vo: shareOpts.voiceOwner } : {}),
            version,
          });
          openListeningShare(link, `${preferredRainSet.title} · ${verse.reference}`);
        }}
      />
    ) : (
      <div style={{ paddingBottom: '3rem' }}>
        <button
          onClick={() => setMainTab('advanced')}
          style={{ marginBottom: '1rem', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.55rem 0.9rem', cursor: 'pointer', fontWeight: 800 }}
        >
          ← {t('返回進階功能', 'Back to Advanced')}
        </button>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', maxWidth: '760px' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CloudRain size={28} /> {t('雙語經文雨 Beta', 'Bilingual VerseRain Beta')}
          </h2>
          <p style={{ margin: '0 0 1.2rem 0', color: '#64748b', lineHeight: 1.7 }}>
            {t('測試版會用主要語言朗讀經文，並在每個方塊下方顯示第二語言。第二行目前是短句估算對齊，適合先測試閱讀感。', 'This beta reads the main language and shows a second language under each block. The second line uses estimated phrase alignment so we can test the reading experience first.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.4rem', color: '#334155', fontWeight: 800 }}>
              {t('主要語言與語音', 'Main language and voice')}
              <select
                value={version}
                onChange={(e) => handleVersionChange(e.target.value)}
                style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontWeight: 800 }}
              >
                {BIBLE_LANGUAGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.4rem', color: '#334155', fontWeight: 800 }}>
              {t('第二語言顯示', 'Second language display')}
              <select
                value={bilingualSecondaryVersion}
                onChange={(e) => setBilingualSecondaryVersion(e.target.value)}
                style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontWeight: 800 }}
              >
                {BIBLE_LANGUAGE_OPTIONS.filter(option => option.value !== version).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                initAudio();
                setSpeechReady(true);
                setBilingualRainActive(true);
              }}
              disabled={!preferredRainSet || !secondaryRainSet}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '0.75rem 1.1rem', fontWeight: 900, cursor: preferredRainSet && secondaryRainSet ? 'pointer' : 'wait' }}
            >
              <Play size={18} fill="currentColor" /> {t('開始雙語經文雨', 'Start Bilingual VerseRain')}
            </button>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>
              {preferredRainSet && secondaryRainSet
                ? t('目前使用「經文雨」官方經文組做測試。', 'Using the official VerseRain set for this beta.')
                : t('正在載入語言資料...', 'Loading language data...')}
            </span>
          </div>
        </div>
      </div>
    )
  );
}
