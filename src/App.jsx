import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, Crown, Star, Home, XCircle, Headphones } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index.css';

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function speakText(text, rate = 1.0, lang = 'zh-TW') {
  return new Promise(resolve => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; 
      utterance.rate = rate;

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      utterance.onend = safeResolve;
      utterance.onerror = safeResolve;
      
      // Safety fallback in case Web Speech API hangs
      setTimeout(safeResolve, 2500);

      window.speechSynthesis.speak(utterance);
    } else {
      resolve();
    }
  });
}

function playBong() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(250, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);
  
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

function playTada() {
  initAudio();
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 Arpeggio
  let startTime = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gainNode.gain.setValueAtTime(0, startTime + i * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + i * 0.15 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.15 + 0.6);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(startTime + i * 0.15);
    osc.stop(startTime + i * 0.15 + 0.6);
  });
}

function playFireworksSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(Math.random() * 200 + 100, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.5);
}

import { VERSES_DB as VERSES_CUV } from './verses';
import { VERSES_DB_KJV as VERSES_KJV } from './verses_kjv';

export default function App() {
  const [version, setVersion] = useState('cuv');
  const VERSES_DB = version === 'cuv' ? VERSES_CUV : VERSES_KJV;

  const [activeVerse, setActiveVerse] = useState(VERSES_DB[0]);
  const [selectedVerseRefs, setSelectedVerseRefs] = useState([VERSES_DB[0].reference]);

  useEffect(() => {
    setActiveVerse(VERSES_DB[0]);
    setSelectedVerseRefs([VERSES_DB[0].reference]);
  }, [version]);

  const toggleSelection = (ref) => {
    setSelectedVerseRefs(prev => 
      prev.includes(ref) 
        ? prev.filter(r => r !== ref) 
        : [...prev, ref]
    );
  };

  
  const activePhrases = React.useMemo(() => {
    return activeVerse.text.split(/[,，。；：「」、;:\.\?]/).map(p => p.trim()).filter(Boolean);
  }, [activeVerse]);

  const activePhrasesRef = useRef([]);
  useEffect(() => { activePhrasesRef.current = activePhrases; }, [activePhrases]);

  const [gameState, setGameState] = useState('menu');
  const gameStateRef = useRef('menu');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const isAutoPlayRef = useRef(false);
  useEffect(() => { isAutoPlayRef.current = isAutoPlay; }, [isAutoPlay]);

  const [blocks, setBlocks] = useState([]);
  
  const [currentSeqIndex, setCurrentSeqIndex] = useState(0);
  const currentSeqRef = useRef(0);
  useEffect(() => { currentSeqRef.current = currentSeqIndex; }, [currentSeqIndex]);

  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(3);
  const healthRef = useRef(3);
  useEffect(() => { healthRef.current = health; }, [health]);

  const [timeLeft, setTimeLeft] = useState(60);
  
  const [bestScore, setBestScore] = useState(0);
  useEffect(() => {
    const loaded = parseInt(localStorage.getItem(`verseRainBestScore_${activeVerse.reference}`)) || 0;
    setBestScore(loaded);
  }, [activeVerse]);
  const [isFlawless, setIsFlawless] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [timeBonus, setTimeBonus] = useState(0);
  const [campaignQueue, setCampaignQueue] = useState(null);
  const [campaignResults, setCampaignResults] = useState([]);

  const timerRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    // Dynamically scale animation speeds (10% increase compounding, or simply linear)
    // Here we compound by 10% every combo tier. 
    // Math.pow(1.1, 0) = 1.0; Math.pow(1.1, 1) = 1.1; Math.pow(1.1, 2) = 1.21
    const rate = isAutoPlay ? 1.0 : Math.min(Math.pow(1.1, combo), 2.2); // Cap at 2.2x speed, lock to 1 for auto-play
    
    // Grab all actively falling blocks and adjust their native playback rate on the fly
    const wrappers = document.querySelectorAll('.falling-wrapper');
    wrappers.forEach(el => {
      const anims = el.getAnimations();
      anims.forEach(anim => {
        if (anim.animationName === 'fall') {
            anim.playbackRate = rate;
            if (isAutoPlay) {
                anim.pause();
            } else {
                anim.play();
            }
        }
      });
    });
  }, [combo, blocks, isAutoPlay]);

  const spawnNextBlock = () => {
    setBlocks(prev => {
      const phrases = activePhrasesRef.current;
      const targetSeq = currentSeqRef.current;
      if (targetSeq >= phrases.length) return prev;
      
      const onScreenIndices = prev.map(b => b.seqIndex);
      const candidates = [];
      for (let i = targetSeq; i < phrases.length; i++) {
        if (!onScreenIndices.includes(i)) {
          candidates.push(i);
        }
      }
      
      if (candidates.length === 0) return prev; 

      let seqToSpawn = -1;
      if (candidates.includes(targetSeq)) {
          seqToSpawn = targetSeq; // Absolute guarantee the required phrase is spawned if missing
      } else {
          // Preload an upcoming contiguous future block so it's already on screen
          const nextImmediateCandidates = candidates.slice(0, 3);
          seqToSpawn = nextImmediateCandidates[Math.floor(Math.random() * nextImmediateCandidates.length)];
      }
      
      const lanes = [5, 35, 65];
      const assignedLane = Math.floor(Math.random() * 3);
      const xPos = lanes[assignedLane] + Math.random() * 10;
      
      const newBlock = {
        id: Math.random().toString(36).substr(2, 9),
        text: phrases[seqToSpawn],
        seqIndex: seqToSpawn,
        xPos: xPos,
        duration: 12 + Math.random() * 4,
        error: false,
        correct: false
      };
      
      return [...prev, newBlock];
    });
  };

  const startSingleGame = () => {
    setCampaignQueue(null);
    setCampaignResults([]);
    startGame();
  };

  const startGame = (isAuto = false) => {
    initAudio(); 
    setGameState('playing');
    setIsAutoPlay(isAuto);
    setScore(0);
    setCombo(0);
    setHealth(3);
    setTimeLeft(60);
    setCurrentSeqIndex(0);
    currentSeqRef.current = 0;
    setBlocks([]);
    setIsFlawless(false);
    setIsNewHighScore(false);
    setIsFailed(false);
    setTimeBonus(0);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1 && !isAutoPlayRef.current) {
          endGame();
          return 0;
        }
        return Math.max(0, t - 1);
      });
    }, 1000);

    if (isAuto) {
      setTimeout(spawnNextBlock, 100);
    } else {
      setTimeout(spawnNextBlock, 100);
      setTimeout(spawnNextBlock, 1500);
      setTimeout(spawnNextBlock, 3000);
      setTimeout(spawnNextBlock, 4500);
    }
  };

  useEffect(() => {
    let cancelAutoPlay = false;

    const processAutoPlay = async () => {
      if (!isAutoPlay || gameState !== 'playing') return;
      if (currentSeqIndex >= activePhrasesRef.current.length) return;

      let targetBlock = blocks.find(b => b.seqIndex === currentSeqIndex);
      
      if (!targetBlock) {
          setTimeout(() => { if (!cancelAutoPlay) processAutoPlay(); }, 300);
          return;
      }

      if (!cancelAutoPlay && gameState === 'playing') {
          if (speechRef.current) {
              await speechRef.current; // Crucial: wait for previous reading to finish before clicking the next block securely
          }
          if (cancelAutoPlay || gameState !== 'playing') return;
          handleBlockClick(targetBlock);
      }
    };

    if (isAutoPlay && gameState === 'playing') {
      processAutoPlay();
    }
    return () => { cancelAutoPlay = true; };
  }, [currentSeqIndex, blocks, isAutoPlay, gameState]);

  const triggerFireworks = () => {
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    let soundTick = 0;
    (function frame() {
      if (soundTick % 10 === 0) playFireworksSound(); // Spread out sound
      soundTick++;

      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#3b82f6', '#fbbf24', '#f87171', '#34d399']
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#3b82f6', '#fbbf24', '#f87171', '#34d399']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const triggerFlawless = () => {
    confetti({
        particleCount: 150, spread: 100, origin: { y: 0.4 },
        colors: ['#fbbf24', '#fef08a']
    });
  }

  const endGame = () => {
    setGameState('gameover');
    setBlocks([]); // clear arena
    if (timerRef.current) clearInterval(timerRef.current);

    // The undeniable source of truth for success is hitting the last verse piece
    const isSuccess = currentSeqRef.current >= activePhrases.length;
    const failed = !isSuccess;

    const f = isSuccess && healthRef.current === 3;

    let finalCalculatedScore = scoreRef.current;
    
    if (isSuccess) {
        const calculatedTimeBonus = Math.max(0, timeLeft) * 50;
        setTimeBonus(calculatedTimeBonus);
        finalCalculatedScore += calculatedTimeBonus;
        setScore(finalCalculatedScore);
        scoreRef.current = finalCalculatedScore;
    } else {
        setTimeBonus(0);
    }

    const hs = isSuccess && finalCalculatedScore > bestScore && finalCalculatedScore > 0;

    setIsFlawless(f);
    setIsNewHighScore(hs);
    setIsFailed(failed);

    if (hs) {
      setBestScore(finalCalculatedScore);
      localStorage.setItem(`verseRainBestScore_${activeVerse.reference}`, finalCalculatedScore);
    }

    if (isSuccess) {
      const playVictorySounds = () => {
        playTada();
        if (hs) {
          setTimeout(triggerFireworks, 500); // Small delay for the tada to ring out
        } else if (f) {
          triggerFlawless();
        }
      };

      if (speechRef.current) {
         speechRef.current.then(playVictorySounds);
      } else {
         playVictorySounds();
      }
    }

    setCampaignResults(prev => {
        if (campaignQueue !== null) {
            return [...prev, { verse: activeVerse, score: isSuccess ? finalCalculatedScore : 0, flawless: f }];
        }
        return prev;
    });

    if (isAutoPlayRef.current && isSuccess) {
       setTimeout(() => {
           if (gameStateRef.current !== 'menu') {
             if (campaignQueue !== null && campaignQueue.length > 0) {
                 setActiveVerse(campaignQueue[0]);
                 setCampaignQueue(campaignQueue.slice(1));
                 startGame(true);
             } else if (campaignQueue !== null && campaignQueue.length === 0) {
                 setGameState('campaign-results');
             } else {
                 // For single play auto-play, just return to menu
                 setGameState('menu');
             }
           }
       }, 2000);
    }
  };

  useEffect(() => {
    if (currentSeqIndex >= activePhrases.length && gameState === 'playing') {
       endGame();
    }
  }, [currentSeqIndex, gameState]);

  const handleAnimationEnd = (e, id) => {
    if (e.animationName === 'fall') {
      setBlocks(prev => prev.filter(b => b.id !== id));
      if (gameState === 'playing') spawnNextBlock();
    }
  };

  const handleBlockClick = (block) => {
    if (block.correct || block.error) return; 

    if (block.seqIndex === currentSeqIndex) {
      const voiceRate = isAutoPlayRef.current ? 1.0 : Math.min(Math.pow(1.1, combo), 2.2);

      setScore(s => s + 100 + (combo * 50));
      setCombo(c => c + 1);
      
      const nextSeq = currentSeqIndex + 1;
      const TTS_LANG = version === 'kjv' ? 'en-US' : 'zh-TW';
      
      if (nextSeq === activePhrases.length - 1) {
        // Only one final block remaining - auto-complete it to save a click
        // Concatenate both pieces together to say it completely
        const finalVoiceRate = isAutoPlayRef.current ? 1.0 : Math.min(Math.pow(1.1, combo + 1), 2.2);
        const combinedText = block.text + (version === 'kjv' ? ". " : "，") + activePhrases[nextSeq];
        speechRef.current = speakText(combinedText, finalVoiceRate, TTS_LANG);

        setScore(s => s + 100 + ((combo + 1) * 50));
        setCombo(c => c + 1);
        setCurrentSeqIndex(activePhrases.length);
        currentSeqRef.current = activePhrases.length;
      } else {
        speechRef.current = speakText(block.text, voiceRate, TTS_LANG);
        setCurrentSeqIndex(nextSeq);
        currentSeqRef.current = nextSeq; // Update instantly before useEffect triggers
      }
      
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, correct: true } : b));
      
      // Fire next spawn instantly, don't wait for the disappear timeout!
      if (gameState === 'playing') spawnNextBlock();
      
      setTimeout(() => {
        setBlocks(prev => prev.filter(b => b.id !== block.id));
      }, 400);

    } else {
      playBong();
      setCombo(0);
      setScore(s => Math.max(0, s - 100)); // Apply mistake penalty, preventing negative score
      setHealth(h => {
        if (h - 1 <= 0) {
          endGame();
          return 0;
        }
        return h - 1;
      });
      
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, error: true } : b));
      setTimeout(() => {
        setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, error: false } : b));
      }, 400);
    }
  };

  const handleGlobalClick = (e) => {
    if (gameState !== 'playing') return;
    
    // Ignore clicks if they click directly on the top HUD UI elements
    if (e.target.closest('.hud-glass')) return;

    const elements = document.querySelectorAll('.falling-wrapper');
    if (elements.length === 0) return;

    let closestId = null;
    let minDistance = Infinity;

    elements.forEach(el => {
      const inner = el.querySelector('.falling-block-inner');
      if (!inner) return;

      const rect = inner.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Euclidean distance to determine "intent"
      const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
      
      if (dist < minDistance) {
        minDistance = dist;
        closestId = el.getAttribute('data-id');
      }
    });

    if (closestId) {
      const clickedBlock = blocks.find(b => b.id === closestId);
      if (clickedBlock) {
        handleBlockClick(clickedBlock);
      }
    }
  };

  return (
    <>
      <div className="bg-layer" />

      {gameState === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100dvh', width: '100vw', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top) + 2rem) 1rem 4rem' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '1.5rem', marginTop: '2rem', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
            VerseRain
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '2rem', textAlign: 'center', maxWidth: '600px' }}>
            Select a verse below. Catch the phrases as they fall in chronological order!
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button 
              onClick={() => setVersion('cuv')} 
              style={{
                background: version === 'cuv' ? '#3b82f6' : 'transparent',
                color: version === 'cuv' ? 'white' : '#94a3b8',
                border: version === 'cuv' ? 'none' : '1px solid #475569',
                padding: '0.5rem 1.5rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              和合本
            </button>
            <button 
              onClick={() => setVersion('kjv')} 
              style={{
                background: version === 'kjv' ? '#3b82f6' : 'transparent',
                color: version === 'kjv' ? 'white' : '#94a3b8',
                border: version === 'kjv' ? 'none' : '1px solid #475569',
                padding: '0.5rem 1.5rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              KJV
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
            <button 
              onClick={() => {
                if (selectedVerseRefs.length === 0) return;
                const queue = VERSES_DB.filter(v => selectedVerseRefs.includes(v.reference));
                const sortedQueue = [...queue];
                setCampaignQueue(sortedQueue.slice(1));
                setCampaignResults([]);
                setActiveVerse(sortedQueue[0]);
                setTimeout(() => startGame(true), 50);
              }}
              className="play-btn"
              style={{
                background: selectedVerseRefs.length === 0 ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '1rem 2rem', flex: '1 1 200px',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '9999px', cursor: selectedVerseRefs.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: selectedVerseRefs.length === 0 ? 'none' : '0 0 20px rgba(16, 185, 129, 0.5)', transition: 'all 0.2s', justifyContent: 'center'
              }}
            >
              <Headphones fill="white" size={20} /> Auto-Play
            </button>
            <button 
              onClick={() => {
                if (selectedVerseRefs.length === 0) return;
                const queue = VERSES_DB.filter(v => selectedVerseRefs.includes(v.reference));
                if (queue.length === 1) {
                  setActiveVerse(queue[0]);
                  setCampaignQueue(null);
                  setCampaignResults([]);
                  setTimeout(() => startGame(false), 50);
                } else {
                  const shuffled = [...queue].sort(() => Math.random() - 0.5);
                  setCampaignQueue(shuffled.slice(1));
                  setCampaignResults([]);
                  setActiveVerse(shuffled[0]);
                  setTimeout(() => startGame(false), 50);
                }
              }}
              className="play-btn"
              style={{
                background: selectedVerseRefs.length === 0 ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', padding: '1rem 2rem', flex: '1 1 200px',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '9999px', cursor: selectedVerseRefs.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: selectedVerseRefs.length === 0 ? 'none' : '0 0 20px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', justifyContent: 'center'
              }}
            >
              <Play fill="white" size={20} /> Play Selected
            </button>
            <button 
              onClick={() => {
                  const shuffled = [...VERSES_DB].sort(() => Math.random() - 0.5);
                  setCampaignQueue(shuffled.slice(1));
                  setCampaignResults([]);
                  setActiveVerse(shuffled[0]);
                  setTimeout(() => startGame(false), 50);
              }}
              className="play-btn"
              style={{
                background: '#8b5cf6', color: 'white', border: 'none', padding: '1rem 2rem', flex: '1 1 200px',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '9999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)', transition: 'all 0.2s', justifyContent: 'center'
              }}
            >
              <Star fill="white" size={20} /> Play All (Campaign)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', width: '100%', maxWidth: '900px', marginBottom: '2rem' }}>
            {VERSES_DB.map((v, i) => {
               const vBest = parseInt(localStorage.getItem(`verseRainBestScore_${v.reference}`)) || 0;
               const isSelected = selectedVerseRefs.includes(v.reference);
               return (
                  <div 
                     key={i} 
                     className="hud-glass verse-card" 
                     onClick={() => toggleSelection(v.reference)}
                     style={{ cursor: 'pointer', padding: '1.5rem', transition: 'all 0.2s', border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)', transform: isSelected ? 'scale(1.02)' : 'scale(1)', textAlign: 'left', display: 'flex', flexDirection: 'column' }}
                  >
                      <h3 style={{ color: '#93c5fd', marginBottom: '0.2rem', fontSize: '1.2rem' }}>{v.reference}</h3>
                      <div style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 'bold' }}>{v.title}</div>
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', flex: 1, maxHeight: '100px', overflowY: 'auto', paddingRight: '0.5rem', lineHeight: '1.5' }}>{v.text}</p>
                      {vBest > 0 && <div style={{ marginTop: '1rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Crown size={14}/> Best: {vBest}</div>}
                  </div>
               )
            })}
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div 
          onClick={handleGlobalClick}
          style={{ position: 'absolute', width: '100vw', height: '100vh', top: 0, left: 0, overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                  className="hud-glass"
                  onClick={(e) => {
                     e.stopPropagation();
                     if (timerRef.current) clearInterval(timerRef.current);
                     if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                     setGameState('menu');
                  }}
                  style={{ padding: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}
              >
                  <XCircle size={32} />
              </button>
              <div className="hud-glass" style={{ padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#93c5fd' }}>{activeVerse.reference}</span>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                   Next: {currentSeqIndex < activePhrases.length ? activePhrases[currentSeqIndex] : "Complete!"}
                </span>
              </div>
            </div>

            <div className="hud-glass" style={{ padding: '1rem 2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
                 {[...Array(3)].map((_, i) => (
                   <Heart key={i} size={24} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                 ))}
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                 <Zap size={24} fill="#fbbf24" strokeWidth={0} /> {combo}x
               </div>
            </div>

            <div className="hud-glass" style={{ padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '150px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-10px', left: '10px', color: '#fbbf24', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Crown size={12} /> BEST {bestScore}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                {String(score).padStart(6, '0')}
              </div>
              <div style={{ fontSize: '1.25rem', color: timeLeft <= 10 ? '#f87171' : '#cbd5e1', fontFamily: 'monospace' }}>
                00:{String(timeLeft).padStart(2, '0')}
              </div>
            </div>
          </div>

          <div style={{ position: 'absolute', width: '100vw', height: '100vh', top: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {blocks.map((block) => {
              let appliedClasses = 'falling-block-inner';
              if (block.error) appliedClasses += ' error-shake';
              if (block.correct) appliedClasses += ' success-flash';
              
              return (
                <div 
                  key={block.id}
                  className="falling-wrapper"
                  data-id={block.id}
                  style={{
                    position: 'absolute',
                    top: '-30px',
                    left: `${block.xPos}%`,
                    animation: `fall ${block.duration}s linear forwards`,
                    zIndex: block.seqIndex === currentSeqIndex ? 50 : 10
                  }}
                  onAnimationEnd={(e) => handleAnimationEnd(e, block.id)}
                >
                  <div className={appliedClasses}>
                    {block.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', zIndex: 20, position: 'relative' }}>
          {isFailed ? (
            <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '900px', border: '1px solid #f87171', maxHeight: '95dvh', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 'clamp(2rem, 5vh, 3rem)', color: '#f87171', marginBottom: 'clamp(0.5rem, 2vh, 1rem)' }}>Keep Trying!</h2>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: 'clamp(1rem, 3vw, 2.5rem)', borderRadius: '16px', marginBottom: 'clamp(1rem, 3vh, 2.5rem)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: 'clamp(0.9rem, 2vh, 1.2rem)', color: '#cbd5e1', marginBottom: 'clamp(0.5rem, 2vh, 1.5rem)', textTransform: 'uppercase', letterSpacing: '2px' }}>Review the correct sequence:</p>
                  <div style={{ fontSize: 'clamp(1.2rem, 3.5vh, 2.2rem)', color: '#fff', lineHeight: '1.6', fontWeight: 'bold' }}>
                    {activePhrases.map((phrase, idx) => (
                        <span key={idx} style={{ color: idx % 2 === 0 ? '#93c5fd' : '#cbd5e1' }}>{phrase}{" "}</span>
                    ))}
                  </div>
              </div>
              <button 
                onClick={startGame}
                className="play-btn"
                style={{
                  width: '100%', maxWidth: '400px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1.2rem)',
                  fontSize: 'clamp(1.1rem, 2.5vh, 1.3rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto', flexShrink: 0
                }}
              >
                <RotateCcw size={24} /> Play Again
              </button>
            </div>
          ) : (
            <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', maxHeight: '95dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', animation: isNewHighScore || isFlawless ? 'flashSuccess 1s ease-out' : 'none' }}>
              
              <div style={{ flexShrink: 0 }}>
                {isNewHighScore ? (
                   <Crown size={48} color="#fbbf24" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)', animation: 'bounce 1s infinite' }} />
                ) : isFlawless ? (
                   <Star size={48} color="#34d399" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)' }} />
                ) : (
                   <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)' }} />
                )}
    
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', marginBottom: '0.5rem', color: '#fff' }}>
                   {isNewHighScore ? "New High Score!" : isFlawless ? "Flawless Setup!" : "Round Over"}
                </h2>
    
                {isFlawless && !isNewHighScore && (
                   <div style={{ color: '#34d399', fontSize: 'clamp(1rem, 2vh, 1.2rem)', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', fontWeight: 'bold' }}>
                     Perfect Sequence!
                   </div>
                )}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 'clamp(1rem, 3vw, 2rem)', borderRadius: '16px', margin: 'clamp(0.5rem, 2vh, 2rem) 0', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#cbd5e1', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', textTransform: 'uppercase', letterSpacing: '1px' }}>The Correct Sequence:</p>
                  <div style={{ fontSize: 'clamp(1.1rem, 3vh, 2rem)', color: '#fff', lineHeight: '1.5', fontWeight: 'bold' }}>
                    {activePhrases.map((phrase, idx) => (
                        <span key={idx} style={{ color: idx % 2 === 0 ? '#93c5fd' : '#cbd5e1' }}>{phrase}{" "}</span>
                    ))}
                  </div>
              </div>
  
              <div style={{ flexShrink: 0 }}>
                {timeBonus > 0 && (
                  <div style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#34d399', marginBottom: 'clamp(0.2rem, 1vh, 0.5rem)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Time Bonus: {timeLeft}s × 50 = +{timeBonus}
                  </div>
                )}
                <div style={{ fontSize: 'clamp(1rem, 2.5vh, 1.25rem)', color: '#cbd5e1', marginBottom: 'clamp(0.5rem, 2vh, 1rem)' }}>
                  Final Score: <strong style={{ color: isNewHighScore ? '#fbbf24' : '#fff', fontSize: 'clamp(2rem, 5vh, 2.5rem)', display: 'block', marginTop: '0.2rem' }}>{score}</strong>
                </div>
    
                {campaignQueue !== null ? (
                    campaignQueue.length > 0 ? (
                        <button 
                          onClick={() => {
                              setActiveVerse(campaignQueue[0]);
                              setCampaignQueue(campaignQueue.slice(1));
                              setTimeout(startGame, 50);
                          }}
                          className="play-btn"
                          style={{
                            width: '100%', maxWidth: '300px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                            fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto'
                          }}
                        >
                          Next Sequence
                        </button>
                    ) : (
                        <button 
                          onClick={() => setGameState('campaign-results')}
                          className="play-btn"
                          style={{
                            width: '100%', maxWidth: '300px', background: '#8b5cf6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                            fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto'
                          }}
                        >
                          View Final Results
                        </button>
                    )
                ) : (
                    <button 
                      onClick={() => setGameState('menu')}
                      className="play-btn"
                      style={{
                        width: '100%', maxWidth: '300px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                        fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto'
                      }}
                    >
                      <Home size={20} /> Back to Menu
                    </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {gameState === 'campaign-results' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', width: '100vw', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top) + 2rem) 1rem 4rem' }}>
           <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column', animation: 'flashSuccess 1s ease-out' }}>
             <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto 1rem' }} />
             <h2 style={{ fontSize: 'clamp(2rem, 4vh, 2.5rem)', color: '#fff', marginBottom: '1.5rem' }}>Campaign Complete!</h2>
             
             <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', overflowY: 'auto', maxHeight: '50vh', marginBottom: '2rem' }}>
                {campaignResults.map((result, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: i < campaignResults.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                       <div style={{ textAlign: 'left' }}>
                         <div style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '1.1rem' }}>{result.verse.reference}</div>
                         <div style={{ color: result.score > 0 ? '#34d399' : '#f87171', fontSize: '0.9rem' }}>{result.score > 0 ? (result.flawless ? 'Flawless' : 'Cleared') : 'Failed'}</div>
                       </div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.score > 0 ? '#fbbf24' : '#64748b' }}>{result.score}</div>
                    </div>
                ))}
             </div>
             
             <div style={{ fontSize: '1.5rem', color: '#cbd5e1', marginBottom: '2rem' }}>
                Grand Total: <strong style={{ color: '#fbbf24', fontSize: '3rem', display: 'block', marginTop: '0.5rem' }}>{campaignResults.reduce((sum, r) => sum + r.score, 0)}</strong>
             </div>

             <button 
              onClick={() => setGameState('menu')}
              className="play-btn"
              style={{
                background: '#3b82f6', color: 'white', border: 'none', padding: '1rem',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', margin: '0 auto', maxWidth: '300px', width: '100%'
              }}
             >Return to Menu</button>
           </div>
        </div>
      )}
    </>
  );
}
