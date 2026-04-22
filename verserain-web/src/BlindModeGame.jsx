import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Heart, Zap, XCircle } from 'lucide-react';

export default function BlindModeGame({
    activeVerse,
    activePhrases,
    currentSeqIndex,
    onWordMatch,
    onWordMiss,
    playDing,
    version,
    t,
    onFail,
    speakText,
    formatVerseReferenceForSpeech,
    isDebugMode,
    playMode,
    health,
    timeLeft,
    score,
    combo
}) {
    const [micStatus, setMicStatus] = useState("初始化中...");
    const [heardText, setHeardText] = useState("");
    const [currentAccuracy, setCurrentAccuracy] = useState(0);
    const [isSuccessFlash, setIsSuccessFlash] = useState(false);
    const [missCount, setMissCount] = useState(0);
    const [missedIndices, setMissedIndices] = useState([]);
    const [countdown, setCountdown] = useState(null); // visual countdown
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const countdownRef = useRef(null);
    const isSuccessFlashRef = useRef(false);
    const missCountRef = useRef(0);
    const isMountedRef = useRef(true);
    const lastMatchedIndexRef = useRef(-1);
    const lastMatchedLengthRef = useRef(0);
    const latestTranscriptRef = useRef(null);
    const activeBlockRef = useRef(null);

    const currentBlock = activePhrases[currentSeqIndex] || null;
    const currentBlockRef = useRef(currentBlock);
    const currentSeqIndexRef = useRef(currentSeqIndex);
    const isComplete = currentSeqIndex >= activePhrases.length || !currentBlock;
    const isCompleteRef = useRef(isComplete);

    const onWordMatchRef = useRef(onWordMatch);
    const onWordMissRef = useRef(onWordMiss);
    const onFailRef = useRef(onFail);

    useEffect(() => {
        currentBlockRef.current = currentBlock;
        currentSeqIndexRef.current = currentSeqIndex;
        isCompleteRef.current = isComplete;
        onWordMatchRef.current = onWordMatch;
        onWordMissRef.current = onWordMiss;
        onFailRef.current = onFail;
    }, [currentBlock, currentSeqIndex, isComplete, onWordMatch, onWordMiss, onFail]);

    useEffect(() => {
        if (activeBlockRef.current) {
            activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentSeqIndex]);

    const TTS_LANG = version === 'kjv' ? 'en-US' : (version === 'ja' ? 'ja-JP' : (version === 'ko' ? 'ko-KR' : 'zh-TW'));

    useEffect(() => {
        isMountedRef.current = true;
        missCountRef.current = 0;
        isSuccessFlashRef.current = false;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        return () => { isMountedRef.current = false; };
    }, []);

    const playDong = () => {
        try {
            if (!window.__sharedDongCtx) {
                window.__sharedDongCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const actx = window.__sharedDongCtx;
            if (actx.state === 'suspended') actx.resume();
            const osc = actx.createOscillator();
            const gn = actx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, actx.currentTime); // Lower pitch for Dong
            gn.gain.setValueAtTime(0, actx.currentTime);
            gn.gain.linearRampToValueAtTime(0.25, actx.currentTime + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 1.0);
            osc.connect(gn); gn.connect(actx.destination);
            osc.start(); osc.stop(actx.currentTime + 1.0);
        } catch (e) { console.error(e); }
    };

    const ensureMicAlive = () => {
        if (!isMountedRef.current) return;
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {
                // InvalidStateError means it's already running — that's fine
            }
        }
        setMicStatus(t("聆聽中...", "Listening..."));
    };

    useEffect(() => {
        const heartbeat = setInterval(() => {
            if (!isMountedRef.current) return;
            if (isCompleteRef.current) return;
            ensureMicAlive();
        }, 2000);
        return () => clearInterval(heartbeat);
    }, []);

    const startTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        let remaining = 5;
        setCountdown(remaining);
        countdownRef.current = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);
            if (remaining <= 0) clearInterval(countdownRef.current);
        }, 1000);

        timerRef.current = setTimeout(() => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setCountdown(null);
            if (isCompleteRef.current) return;
            const block = currentBlockRef.current;
            if (block && !isSuccessFlashRef.current) {
                missCountRef.current += 1;
                setMissCount(missCountRef.current);
                setMissedIndices(prev => [...prev, currentSeqIndexRef.current]);

                playDong();
                
                setTimeout(() => {
                    if (isMountedRef.current) {
                        if (onWordMissRef.current) onWordMissRef.current();
                    }
                }, 500);
            } else {
                startTimer();
            }
        }, 5000);
    };

    const hasSpokenRef = useRef(false);

    useEffect(() => {
        hasSpokenRef.current = false;
    }, [activeVerse]);

    useEffect(() => {
        if (isComplete) return;

        if (currentSeqIndex === 0 && activeVerse && !hasSpokenRef.current) {
            hasSpokenRef.current = true;
            // Speak the verse reference before starting
            const formattedRef = formatVerseReferenceForSpeech ? formatVerseReferenceForSpeech(activeVerse.reference, version) : activeVerse.reference;
            speakText(formattedRef, 1.0, TTS_LANG).then(() => {
                if (!isMountedRef.current) return;
                startTimer();
            });
        } else if (currentBlock) {
            startTimer();
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [currentSeqIndex, activeVerse, TTS_LANG, speakText]);

    const evaluateTranscriptRef = useRef(null);

    useEffect(() => {
        evaluateTranscriptRef.current = () => {
            const transcriptObj = latestTranscriptRef.current;
            if (!transcriptObj || !transcriptObj.transcript.trim()) return;

            const { index: lastIndex, transcript: currentTranscript } = transcriptObj;
            
            setHeardText(currentTranscript);
            const block = currentBlockRef.current;
            if (block && !isSuccessFlashRef.current) {
                const targetText = typeof block === 'string' ? block : (block.text || '');
                const cleanTarget = targetText.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
                
                let textToProcess = currentTranscript;
                if (lastMatchedIndexRef.current === lastIndex) {
                    textToProcess = currentTranscript.substring(lastMatchedLengthRef.current);
                } else {
                    lastMatchedIndexRef.current = lastIndex;
                    lastMatchedLengthRef.current = 0;
                }
                
                const cleanHeard = textToProcess.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();

                if (!cleanHeard) {
                    setCurrentAccuracy(0);
                    return;
                }

                // Order-preserving character match
                let matchCount = 0;
                let heardIdx = 0;
                for (let c of cleanTarget) {
                    let foundIdx = cleanHeard.indexOf(c, heardIdx);
                    if (foundIdx !== -1) {
                        matchCount++;
                        heardIdx = foundIdx + 1;
                    }
                }
                
                const calculatedAccuracy = cleanTarget.length === 0 ? 0 : Math.round((matchCount / cleanTarget.length) * 100);
                setCurrentAccuracy(calculatedAccuracy);

                let isMatch = false;
                let consumedCleanLength = 0;
                
                if (cleanHeard.includes(cleanTarget)) {
                    isMatch = true;
                    consumedCleanLength = cleanHeard.indexOf(cleanTarget) + cleanTarget.length;
                } else if (calculatedAccuracy >= 60) {
                    isMatch = true;
                    consumedCleanLength = heardIdx;
                }

                if (isMatch) {
                    // Map consumedCleanLength back to raw length in textToProcess
                    let rawLength = 0;
                    let cleanCharsSeen = 0;
                    for (let i = 0; i < textToProcess.length; i++) {
                        rawLength = i + 1;
                        if (/[^\w\u4e00-\u9fa5]/.test(textToProcess[i]) === false) {
                            cleanCharsSeen++;
                            if (cleanCharsSeen === consumedCleanLength) {
                                break;
                            }
                        }
                    }
                    
                    lastMatchedLengthRef.current += rawLength;
                    
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    setCountdown(null);
                    setHeardText(t("收到正確！等候中...", "Correct! Waiting..."));
                    setCurrentAccuracy(100);
                    isSuccessFlashRef.current = true;
                    setIsSuccessFlash(true);
                    
                    playDing();

                    setTimeout(() => {
                        if (!isMountedRef.current) return;
                        isSuccessFlashRef.current = false;
                        setIsSuccessFlash(false);
                        onWordMatchRef.current(block);
                    }, 250); // Reduced timeout for faster combo passing
                }
            }
        };
    });

    // Re-evaluate the transcript automatically when moving to the next sequence
    useEffect(() => {
        const sequenceChangeTimer = setTimeout(() => {
            if (isMountedRef.current && !isCompleteRef.current && evaluateTranscriptRef.current) {
                evaluateTranscriptRef.current();
            }
        }, 300);
        return () => clearTimeout(sequenceChangeTimer);
    }, [currentSeqIndex]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMicStatus(t("您的瀏覽器不支援語音辨識", "Browser does not support Speech Recognition"));
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = TTS_LANG;

        recognition.onstart = () => {
            setMicStatus(t("聆聽中...", "Listening..."));
        };

        recognition.onresult = (event) => {
            const lastIndex = event.results.length - 1;
            const lastResult = event.results[lastIndex];
            latestTranscriptRef.current = { index: lastIndex, transcript: lastResult[0].transcript };
            if (evaluateTranscriptRef.current) {
                evaluateTranscriptRef.current();
            }
        };

        recognition.onerror = (e) => {
            console.log("Speech recognition error:", e.error);
        };

        recognition.onend = () => {};

        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        try {
            recognition.start();
        } catch (e) {
            console.error('Initial recognition.start failed:', e);
        }
        
        recognitionRef.current = recognition;

        let heartbeat = setInterval(() => {
            if (recognitionRef.current && isMountedRef.current) {
                try {
                    recognitionRef.current.start();
                } catch(e) {}
            }
        }, 5000);

        return () => {
            clearInterval(heartbeat);
            try { recognition.stop(); } catch(e) {}
        };
    }, [TTS_LANG]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) { }
            }
        };
    }, []);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.5rem 1rem', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', zIndex: 10 }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="hud-glass"
                        onClick={(e) => {
                            e.stopPropagation();
                            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                            if (onFail) onFail();
                        }}
                        style={{ padding: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}
                    >
                        <XCircle size={22} />
                    </button>
                </div>
                
                <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', gap: '0.8rem', alignItems: 'center', height: '100%', minHeight: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f87171' }}>
                        {[...Array(3)].map((_, i) => (
                            <Heart key={i} size={16} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '1rem', fontWeight: 'bold', color: '#fbbf24' }}>
                        <Zap size={16} fill="#fbbf24" strokeWidth={0} /> {combo}x
                    </div>
                </div>

                <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '36px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                            {String(score || 0).padStart(6, '0')}
                        </div>
                    </div>
                    <div style={{ padding: '0.2rem 0.6rem', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>T</div>
                        <div style={{ fontSize: '0.95rem', color: timeLeft <= 1000 ? '#f87171' : '#cbd5e1', fontFamily: 'monospace' }}>
                            {String(Math.floor(timeLeft / 100)).padStart(2, '0')}.{String(timeLeft % 100).padStart(2, '0')}
                        </div>
                    </div>
                </div>
            </div>

            <h1 style={{ color: '#fff', position: 'absolute', top: '15%', margin: 0, textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#bae6fd', marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {activeVerse?.reference}
                </div>
                <div style={{ fontSize: '1.2rem', opacity: 0.9 }}>
                    {playMode === 'voice' ? t("語音模式", "Voice Mode") : t("視障模式", "Blind Mode")} - <span style={{ color: '#4ade80' }}>{micStatus}</span>
                    {countdown !== null && <span style={{ color: '#facc15', marginLeft: '1rem' }}>⏱ {countdown}s</span>}
                </div>
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', width: '100%', maxHeight: '60vh', marginTop: '10vh', overflowY: 'auto', padding: '1rem' }}>
                {activePhrases && activePhrases.map((phrase, index) => {
                    const isActive = index === currentSeqIndex;
                    const isPassed = index < currentSeqIndex;
                    const isMissed = missedIndices.includes(index);
                    const showGold = (isPassed && !isMissed) || (isActive && isSuccessFlash);
                    const isVoiceMode = playMode === 'voice';
                    const isVisible = showGold || isMissed || !isVoiceMode;

                    return (
                        <span
                            key={index}
                            ref={isActive ? activeBlockRef : null}
                            style={{
                                fontSize: '8vw', fontWeight: 'bold', lineHeight: '1.4',
                                color: showGold ? '#fbbf24' : (isActive ? '#cbd5e1' : '#475569'),
                                border: `2px solid ${showGold ? '#fbbf24' : (isActive ? '#94a3b8' : '#334155')}`,
                                padding: '0.4rem 1rem',
                                borderRadius: '16px',
                                opacity: isVisible ? 1 : 0,
                                transition: 'all 0.3s'
                            }}
                        >
                            {phrase.text || phrase}
                        </span>
                    );
                })}
            </div>
            {isDebugMode && heardText && (
                <div style={{ position: 'absolute', bottom: '2%', width: '100%', padding: '1rem 2rem', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderTop: '1px solid #334155' }}>
                    <p style={{ color: '#bae6fd', fontSize: '2.5rem', margin: 0, wordBreak: 'break-word', fontWeight: 'bold' }}>
                        {t("聽見：", "Heard: ")}{heardText}
                        {!isSuccessFlash && heardText !== t("收到正確！等候中...", "Correct! Waiting...") && (
                            <span style={{ 
                                marginLeft: '1rem', 
                                fontSize: '1.5rem', 
                                color: currentAccuracy >= 60 ? '#4ade80' : (currentAccuracy > 0 ? '#facc15' : '#94a3b8'),
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                padding: '0.2rem 0.8rem',
                                borderRadius: '12px',
                                verticalAlign: 'middle'
                            }}>
                                準確率 {currentAccuracy}%
                            </span>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}
