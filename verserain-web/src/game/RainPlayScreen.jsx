// Playing the rain / square game (the falling-block board) — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Crown, Heart, Lightbulb, XCircle, Zap } from 'lucide-react';
import { formatVerseReferenceForDisplay } from '../lib/verseDisplay.js';
import { isEnglishBibleVersion, maskPhraseForPreview } from '../lib/bible.js';

export default function RainPlayScreen({ t, activePhrases, activeVerse, armDelete, bestScore, blocks, combo, currentSeqIndex, deleteArmedId, distractionLevel, flyingBlocks, gameState, getRainBlockFontSize, handleAnimationEnd, handleBlockClick, handleGlobalClick, health, hintSeq, hintTimerRef, isAutoPlay, multiplayerRoomId, multiplayerState, myClientId, playMode, quitGame, score, setCombo, setDeleteArmedId, setHintSeq, speakingTitle, squareBlockFontSize, squareGridSize, timeLeft, version }) {
  return (
    <div
      key={`${playMode}-${activeVerse.reference}-${distractionLevel}`}
      onClick={handleGlobalClick}
      style={{ position: 'absolute', width: '100vw', height: '100dvh', top: 0, left: 0, overflow: 'hidden' }}
    >
      {deleteArmedId === 'game-exit' && (
        <div role="status" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 98px)', left: '12px', zIndex: 40, background: '#dc2626', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.35)', pointerEvents: 'none' }}>
          {t('再按一次離開', 'Tap again to exit')}
        </div>
      )}
      <div className="game-hud" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.5rem 1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: '0.75rem', alignItems: 'start', zIndex: 10, pointerEvents: 'none' }}>
        <div className="game-hud-row game-hud-left" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto', minWidth: 0 }}>
          {/* Exit asks once ("tap again") so a stray tap doesn't end the round. */}
          <button
            className="hud-glass game-hud-chip game-exit-button"
            data-testid="game-exit"
            aria-label={t('離開', 'Exit')}
            onClick={(e) => {
              e.stopPropagation();
              if (deleteArmedId !== 'game-exit') { armDelete('game-exit'); return; }
              setDeleteArmedId(null);
              quitGame();
            }}
            style={{ position: 'relative', zIndex: deleteArmedId === 'game-exit' ? 30 : undefined, padding: '0.5rem 0.7rem', minHeight: '44px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: deleteArmedId === 'game-exit' ? '#fff' : '#f87171', background: deleteArmedId === 'game-exit' ? '#dc2626' : undefined, fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            <XCircle size={20} />
            <span>{t('離開', 'Exit')}</span>
          </button>
          {/* 提示: lights up the next correct block for a moment. It breaks the
              combo but keeps the score (the old 示範 auto-play zeroed it). */}
          {!isAutoPlay && !multiplayerRoomId && (
            <button
              className="hud-glass game-hud-chip game-hint-button"
              data-testid="game-hint"
              onClick={(e) => {
                e.stopPropagation();
                setCombo(0);
                setHintSeq(currentSeqIndex);
                clearTimeout(hintTimerRef.current);
                hintTimerRef.current = setTimeout(() => setHintSeq(null), 1500);
              }}
              title={t('亮出下一個正確的格子（分數不變，連擊會中斷）', 'Highlight the next correct block (score kept, combo resets)')}
              style={{ padding: '0.5rem 0.7rem', minHeight: '44px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <Lightbulb size={16} />
              <span>{t('提示', 'Hint')}</span>
            </button>
          )}

          {!isAutoPlay && !multiplayerRoomId && (
            <div className="hud-glass game-hud-chip game-status-chip" style={{ padding: '0.3rem 0.8rem', display: 'flex', gap: '0.8rem', alignItems: 'center', height: '100%', minHeight: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f87171' }}>
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={16} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '1rem', fontWeight: 'bold', color: '#fbbf24' }}>
                <Zap size={16} fill="#fbbf24" strokeWidth={0} /> {combo}x
              </div>
            </div>
          )}

          {!isAutoPlay && !multiplayerRoomId && (
            <div className="hud-glass game-hud-chip game-score-chip" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '36px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ color: '#fbbf24', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '-2px' }}>
                  <Crown size={10} /> {bestScore}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                  {String(score).padStart(6, '0')}
                </div>
              </div>
            </div>
          )}

          {/* Multiplayer HUD */}
          {!isAutoPlay && multiplayerRoomId && multiplayerState && multiplayerState.players && (
            <div className="hud-glass game-hud-chip game-multiplayer-chip" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '36px', border: '1px solid rgba(59, 130, 246, 0.5)' }}>
              <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '-0.3rem' }}>{t("我", "Me")}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', color: '#f87171' }}>
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={14} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                ))}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                {String(score).padStart(6, '0')}
              </div>
            </div>
          )}
        </div>

        {!isAutoPlay && (
          <div className="hud-glass game-hud-reference" style={{ justifySelf: 'center', padding: '0.35rem 1rem', display: 'flex', alignItems: 'center', minHeight: '40px', pointerEvents: 'none' }}>
            <span style={{ fontSize: 'clamp(1.35rem, 3vw, 2.1rem)', lineHeight: 1, fontWeight: 900, color: '#bfdbfe', textShadow: '0 3px 16px rgba(147, 197, 253, 0.45)', whiteSpace: 'nowrap' }}>{formatVerseReferenceForDisplay(activeVerse.reference, version)}</span>
          </div>
        )}

        <div className="game-hud-row game-hud-right" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '0.75rem', pointerEvents: 'auto' }}>
          {!isAutoPlay && (
            <div className="hud-glass game-hud-chip game-timer-chip" style={{ padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.55rem', minHeight: '42px' }}>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 'bold' }}>{t('剩', 'Time')}</div>
              <div style={{ fontSize: 'clamp(1.25rem, 2vw, 1.7rem)', color: timeLeft <= 1000 ? '#f87171' : '#cbd5e1', fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 1 }}>
                {String(Math.floor(timeLeft / 100)).padStart(2, '0')}.{Math.floor((timeLeft % 100) / 10)}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isAutoPlay && (() => {
        const HUD_PAGE_SIZE = 6;
        const startIdx = Math.floor(currentSeqIndex / HUD_PAGE_SIZE) * HUD_PAGE_SIZE;
        const currentPhrasesWindow = activePhrases.slice(startIdx, currentSeqIndex);

        return (
          <div className="game-next-bar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="hud-glass game-next-panel" style={{ padding: '0.5rem 5vw', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px 16px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
              <div className="game-next-text" style={{ fontSize: 'clamp(1rem, 4vw, 1.4rem)', lineHeight: '1.8', color: '#cbd5e1', wordBreak: 'break-word', alignContent: 'flex-start' }}>
                {currentPhrasesWindow.map((phrase, localIdx) => (
                  <span key={startIdx + localIdx} style={{ color: '#fbbf24', fontWeight: 'bold' }}>{phrase} </span>
                ))}
                {currentSeqIndex < activePhrases.length && (
                  <span id="stack-cursor" style={{ display: 'inline-block', color: '#94a3b8', fontWeight: 'bold', padding: '0 0.4rem', border: '2px dashed rgba(251, 191, 36, 0.4)', borderRadius: '6px', margin: '0 0.2rem', background: 'rgba(251, 191, 36, 0.05)', transition: 'all 0.3s' }}>
                    {t('下一句：', 'Next:')} {maskPhraseForPreview(activePhrases[currentSeqIndex])}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {isAutoPlay ? (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 5vw 2rem' }}>
          <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', maxWidth: '1000px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 'clamp(1.2rem, 3vh, 2rem)', color: speakingTitle ? '#fbbf24' : '#93c5fd', transition: 'color 0.3s', marginBottom: '1rem', fontWeight: 'bold' }}>{formatVerseReferenceForDisplay(activeVerse.reference, version)}</h2>
            <div style={{
              fontSize: (() => {
                const lengthWeight = isEnglishBibleVersion(version) ? activeVerse.text.length / 2.5 : activeVerse.text.length;
                if (lengthWeight > 120) return 'clamp(1rem, min(4.5vw, 3vh), 1.5rem)';
                if (lengthWeight > 70) return 'clamp(1.2rem, min(5vw, 3.5vh), 2rem)';
                return 'clamp(1.5rem, min(6vw, 4vh), 3rem)';
              })(),
              color: '#fff', lineHeight: '1.6', fontWeight: 'bold'
            }}>
              {activePhrases.map((phrase, idx) => {
                let color = '#cbd5e1';
                if (idx < currentSeqIndex) color = '#93c5fd';
                if (idx === currentSeqIndex && !speakingTitle) color = '#fbbf24';
                return <span key={idx} style={{ color, transition: 'color 0.3s' }}>{phrase}{" "}</span>;
              })}
            </div>
          </div>
        </div>
      ) : playMode.startsWith('square') ? (
        <div className="square-grid-container">
          <div className="square-grid-inner" style={{ display: 'grid', gridTemplateColumns: `repeat(${squareGridSize}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${squareGridSize}, minmax(0, 1fr))`, gap: 'clamp(0.5rem, 1.6vmin, 1.25rem)', width: 'min(98vw, 1600px)', height: '100%', pointerEvents: 'auto' }}>
            {blocks.map(block => {
              let appliedClasses = 'falling-block-inner square-block-tile';
              if (block.error) appliedClasses += ' error-shake';
              if (block.correct && (!block.claimedBy || block.claimedBy === myClientId)) appliedClasses += ' success-flash';
              if (hintSeq !== null && block.seqIndex === hintSeq && !block.correct) appliedClasses += ' hint-glow';

              let blockStyle = { cursor: 'pointer', padding: 'clamp(0.6rem, 2.2vmin, 2rem)', fontSize: squareBlockFontSize, display: 'flex', alignItems: 'center', justifyContent: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto', textAlign: 'center', visibility: block.hidden ? 'hidden' : 'visible', borderRadius: 'clamp(16px, 2.2vmin, 30px)' };

              if (block.claimedBy) {
                // Block instantly disappears physically so the flying clone can animate
                blockStyle.visibility = 'hidden';
              }

              return (
                <div key={block.id} data-id={block.id} className={appliedClasses} onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }} style={blockStyle}>
                  {!block.hidden && block.text}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ position: 'absolute', width: '100vw', height: '100dvh', top: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {blocks.map((block) => {
            let appliedClasses = 'falling-block-inner';
            if (block.error) appliedClasses += ' error-shake';
            if (block.correct) appliedClasses += ' success-flash';
            if (hintSeq !== null && block.seqIndex === hintSeq && !block.correct) appliedClasses += ' hint-glow';

            return (
              <div
                key={block.id}
                className="falling-wrapper"
                data-id={block.id}
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: `${Math.min(block.xPos, 68)}%`,
                  animation: `fall ${block.duration}s linear forwards`,
                  animationPlayState: 'running',
                  zIndex: block.seqIndex === currentSeqIndex ? 50 : 10
                }}
                onAnimationEnd={(e) => handleAnimationEnd(e, block.id)}
              >
                <div
                  className={appliedClasses}
                  onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }}
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    minWidth: 'clamp(140px, 27vw, 330px)',
                    maxWidth: 'min(78vw, 520px)',
                    minHeight: 'clamp(3.3rem, 15vh, 140px)',
                    fontSize: getRainBlockFontSize(block.text),
                    padding: 'clamp(0.6rem, 2.6vh, 2rem) clamp(0.9rem, 3.2vw, 2rem)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                    textAlign: 'center',
                  }}
                >
                  {block.text}
                </div>
              </div>
            );
          })}
        </div>

      )}

      {/* Flying Blocks Animation Layer */}
      {gameState === 'playing' && multiplayerRoomId && flyingBlocks.map(fb => (
        <div
          key={fb.id}
          className="falling-block-inner flying-block-anim"
          style={{
            '--startX': fb.startX,
            '--startY': fb.startY,
            '--endX': fb.endX,
            '--endY': fb.endY,
            width: fb.width,
            height: fb.height,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(0.9rem, 2.5vw, 1.5rem)',
            backgroundColor: fb.color,
            borderColor: fb.color,
            boxShadow: `0 0 20px ${fb.color}`,
            color: '#fff',
            wordBreak: 'break-word', hyphens: 'auto', textAlign: 'center'
          }}
        >
          {fb.text}
        </div>
      ))}

      {multiplayerRoomId && health <= 0 && multiplayerState?.playMode !== 'square_solo' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', animation: 'flashSuccess 0.5s ease-out' }}>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}><XCircle size={64} /></div>
          <h2 style={{ color: '#fca5a5', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 2px 10px rgba(239,68,68,0.5)' }}>{t("您已出局！", "You're Out!")}</h2>
          <div style={{ fontSize: '1.2rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', maxWidth: '80%' }}>
            {t("防線已經崩潰。請等待隊友完成...", "Defenses breached. Please wait for your teammates...")}
            {multiplayerState?.campaignQueue && multiplayerState.campaignQueue.length > 1 ? (
              <div style={{ marginTop: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                {t("下一局加油，還有", "Cheer up for next round! You have")} {multiplayerState.campaignQueue.length - 1} {t("次的機會", "more rounds.")}
              </div>
            ) : multiplayerState?.campaignQueue && multiplayerState.campaignQueue.length === 1 ? (
              <div style={{ marginTop: '1rem', color: '#fbbf24', fontWeight: 'bold' }}>
                {t("這是最後一關了！為隊友祈禱吧！", "This is the final round! Pray for your teammates!")}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
