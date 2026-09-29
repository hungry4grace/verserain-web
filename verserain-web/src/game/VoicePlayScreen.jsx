// Playing in voice / blind mode — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import React from 'react';
import { formatVerseReferenceForDisplay, formatVerseReferenceForSpeech } from '../lib/verseDisplay.js';
import { speakText } from '../lib/speech.js';


// Recitation matching (pinyin-pro / opencc-js) stays out of the initial bundle.
const BlindModeGame = React.lazy(() => import('../BlindModeGame'));

export default function VoicePlayScreen({ t, activePhrases, activeVerse, combo, currentSeqIndex, currentSeqRef, health, healthRef, isDebugMode, isGameTimerPausedRef, playMode, quitGame, score, setCombo, setCurrentSeqIndex, setHealth, setScore, skipReadback, timeLeft, version }) {
  return (
    <React.Suspense fallback={<div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>{t('載入中…', 'Loading…')}</div>}>
    <BlindModeGame
      key={activeVerse?.reference}
      activeVerse={activeVerse}
      activePhrases={activePhrases}
      currentSeqIndex={currentSeqIndex}
      onWordMatch={(block) => {
        setScore(s => s + 100 + (combo * 50));
        setCombo(c => c + 1);
        setCurrentSeqIndex(prev => {
          const nextSeq = prev + 1;
          currentSeqRef.current = nextSeq;
          return nextSeq;
        });
      }}
      onWordMiss={() => {
        setCombo(0);
        setHealth(h => {
          const newHealth = Math.max(0, h - 1);
          healthRef.current = newHealth;
          return newHealth;
        });
        setCurrentSeqIndex(prev => {
          const nextSeq = prev + 1;
          currentSeqRef.current = nextSeq;
          return nextSeq;
        });
      }}
      onFail={() => {
        quitGame();
      }}
      health={health}
      timeLeft={timeLeft}
      score={score}
      combo={combo}
      speakText={speakText}
      formatVerseReferenceForSpeech={formatVerseReferenceForSpeech}
      formatVerseReferenceForDisplay={formatVerseReferenceForDisplay}
      onResumeTimer={() => { isGameTimerPausedRef.current = false; }}
      isDebugMode={isDebugMode}
      skipReadback={skipReadback}
      playMode={playMode}
      playDing={() => {
        if (!window.__sharedDingCtx) {
          window.__sharedDingCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const actx = window.__sharedDingCtx;
        if (actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gn = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, actx.currentTime);
        gn.gain.setValueAtTime(0, actx.currentTime);
        gn.gain.linearRampToValueAtTime(0.25, actx.currentTime + 0.02);
        gn.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 1.0);
        osc.connect(gn); gn.connect(actx.destination);
        osc.start(); osc.stop(actx.currentTime + 1.0);
      }}
      version={version}
      t={t}
    />
    </React.Suspense>
  );
}
