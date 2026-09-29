// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { DAILY_RAIN_DROPS, RAIN_FONT_LEVELS } from './rainConstants';
import { Pause, Play, Share2 } from 'lucide-react';
import { formatVerseReferenceForDisplay, formatVerseReferenceForSpeech } from '../lib/verseDisplay.js';
import { getDailyVerseImageUrls, getVoiceLangForVersion, readPlayInkChoice } from '../lib/bible.js';
import { initAudio, pickPresetBgmFile } from '../lib/audio.js';
import { speakTextTimed, stopSpeechIfActive } from '../lib/speech.js';
import { splitVersePhrases } from '../lib/phraseSplitter.js';
import { useEffect, useMemo, useRef, useState } from 'react';

function RainFontControls({ value, onChange, t, className = '' }) {
  const currentIndex = Math.max(0, RAIN_FONT_LEVELS.indexOf(value));
  const setLevel = (index) => onChange(RAIN_FONT_LEVELS[Math.min(RAIN_FONT_LEVELS.length - 1, Math.max(0, index))]);

  return (
    <div className={`rain-font-controls ${className}`} aria-label={t('字體大小', 'Font size')}>
      <button
        type="button"
        onClick={() => setLevel(currentIndex - 1)}
        disabled={currentIndex === 0}
        aria-label={t('縮小字體', 'Decrease font size')}
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => setLevel(1)}
        className={value === 'normal' ? 'is-on' : ''}
        aria-label={t('標準字體', 'Normal font size')}
      >
        A
      </button>
      <button
        type="button"
        onClick={() => setLevel(currentIndex + 1)}
        disabled={currentIndex === RAIN_FONT_LEVELS.length - 1}
        aria-label={t('放大字體', 'Increase font size')}
      >
        A+
      </button>
    </div>
  );
}

export function DailyVerseRainExperience({ verse, version, t, onRead, onChallenge, onShare, onListenLogged, dateLabel, onPrevious, onNext, nextDisabled }) {
  const phrases = useMemo(() => splitVersePhrases(verse?.text || ''), [verse]);
  const backgroundImageUrls = useMemo(() => getDailyVerseImageUrls(verse, dateLabel, version), [verse?.reference, dateLabel, version]);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageOk, setImageOk] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePhrase, setActivePhrase] = useState(-1);
  const [isSettled, setIsSettled] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [fontSizeLevel, setFontSizeLevel] = useState('normal');
  const bgmRef = useRef(null);
  const runRef = useRef(0);

  useEffect(() => {
    setPlayKey(k => k + 1);
    setActivePhrase(-1);
    setIsSettled(false);
    setIsPlaying(false);
    setImageIndex(0);
    setImageOk(true);
    setImageLoaded(false);
  }, [verse?.reference, dateLabel]);

  useEffect(() => {
    if (imageLoaded || !imageOk || backgroundImageUrls[imageIndex]?.startsWith('data:')) return undefined;
    const timeout = window.setTimeout(() => {
      setImageIndex(current => {
        if (current < backgroundImageUrls.length - 1) return current + 1;
        return current;
      });
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [backgroundImageUrls, imageIndex, imageLoaded, imageOk]);

  useEffect(() => {
    if (!bgmRef.current) {
      bgmRef.current = new Audio(pickPresetBgmFile(''));
      bgmRef.current.loop = true;
      bgmRef.current.volume = 0.2;
    }
    return () => {
      bgmRef.current?.pause();
      runRef.current += 1;
    };
  }, []);

  const stopAtmosphere = () => {
    bgmRef.current?.pause();
  };

  const pauseExperience = () => {
    runRef.current += 1;
    bgmRef.current?.pause();
    stopSpeechIfActive();
    setIsPlaying(false);
    setActivePhrase(-1);
    setIsSettled(false);
  };

  const playExperience = async () => {
    if (!verse || isPlaying) return;
    initAudio();
    window.speechSynthesis?.resume?.();
    const runId = runRef.current + 1;
    runRef.current = runId;
    setPlayKey(k => k + 1);
    setIsPlaying(true);
    setIsSettled(false);
    setActivePhrase(-1);

    try {
      if (musicEnabled) {
        if (bgmRef.current) {
          bgmRef.current.currentTime = 0;
          bgmRef.current.play().catch(() => {});
        }
      }

      const lang = getVoiceLangForVersion(version);
      if (voiceEnabled) {
        await speakTextTimed(formatVerseReferenceForSpeech(verse.reference, version), 0.9, lang);
        await new Promise(r => setTimeout(r, 400));
      }

      for (let i = 0; i < phrases.length; i++) {
        if (runRef.current !== runId) return;
        setActivePhrase(i);
        if (voiceEnabled) {
          await speakTextTimed(phrases[i], 0.86, lang);
        } else {
          await new Promise(r => setTimeout(r, Math.max(850, phrases[i].length * 90)));
        }
        await new Promise(r => setTimeout(r, 160));
      }

      if (runRef.current !== runId) return;
      setActivePhrase(phrases.length);
      setIsSettled(true);
      onListenLogged?.();
    } finally {
      if (runRef.current === runId) {
        setIsPlaying(false);
        stopAtmosphere();
      }
    }
  };

  if (!verse) {
    return (
      <div className="daily-verse-rain-shell daily-verse-rain-empty">
        {t('目前沒有可播放的每日經文', 'No daily verse is available yet.')}
      </div>
    );
  }

  return (
    <div className={`daily-verse-rain-shell rain-font-${fontSizeLevel} rain-ink-${readPlayInkChoice()}`}>
      <div
        className="daily-verse-rain-scene"
        key={`${verse.reference}-${playKey}`}
      >
        {imageOk && (
          <img
            className="daily-verse-rain-image"
            src={backgroundImageUrls[imageIndex]}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(false);
              setImageIndex(current => {
                if (current < backgroundImageUrls.length - 1) return current + 1;
                setImageOk(false);
                return current;
              });
            }}
          />
        )}
        <div className={`daily-verse-rain-sky ${imageLoaded ? 'has-ai-image' : ''}`} />
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
        <div className="daily-verse-rain-content">
          <div className="daily-verse-rain-topbar">
            <button type="button" onClick={onPrevious} aria-label={t('前一天', 'Previous day')}>‹</button>
            <div>
              {dateLabel && <div className="daily-verse-rain-date">{dateLabel}</div>}
            </div>
            <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={t('後一天', 'Next day')}>›</button>
          </div>
          <h2>{formatVerseReferenceForDisplay(verse.reference, version)}</h2>
          <div className={`daily-verse-rain-phrases ${isPlaying ? 'is-playing' : ''} ${isSettled ? 'is-settled' : ''}`} aria-live="polite">
            {phrases.map((phrase, index) => (
              <span
                key={`${phrase}-${index}`}
                className={`${index === activePhrase ? 'is-active' : ''} ${index < activePhrase || isSettled ? 'has-landed' : ''}`}
                style={{
                  '--delay': `${Math.min(index * 0.42, 6.2)}s`,
                  '--drift': `${((index % 5) - 2) * 9}px`
                }}
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
        <div className="daily-verse-rain-actions">
          <button type="button" onClick={isPlaying ? pauseExperience : playExperience}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />} {isPlaying ? t('暫停', 'Pause') : t('讀經', 'Read')}
          </button>
          <button type="button" onClick={onChallenge}>
            <Play size={18} fill="currentColor" /> {t('挑戰', 'Challenge')}
          </button>
          <button type="button" onClick={onShare}>
            <Share2 size={18} /> {t('分享', 'Share')}
          </button>
        </div>
      </div>

      <div className="daily-verse-rain-controls" aria-label={t('每日經文雨設定', 'Daily VerseRain settings')}>
        <button type="button" onClick={isPlaying ? pauseExperience : playExperience} className="is-on">
          {isPlaying ? t('暫停', 'Pause') : t('播放經文', 'Play verse')}
        </button>
        <button type="button" onClick={() => setVoiceEnabled(v => !v)} className={voiceEnabled ? 'is-on' : ''}>
          {voiceEnabled ? t('語音開', 'Voice on') : t('語音關', 'Voice off')}
        </button>
        <button type="button" onClick={() => setMusicEnabled(v => !v)} className={musicEnabled ? 'is-on' : ''}>
          {musicEnabled ? t('音樂開', 'Music on') : t('音樂關', 'Music off')}
        </button>
        <RainFontControls value={fontSizeLevel} onChange={setFontSizeLevel} t={t} />
      </div>
    </div>
  );
}
