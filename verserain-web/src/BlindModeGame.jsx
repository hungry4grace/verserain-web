import React, { useEffect, useState, useRef } from 'react';

export default function BlindModeGame({
    activeVerse,
    activePhrases,
    currentSeqIndex,
    onWordMatch,
    speakText,
    playDing,
    version,
    t,
    onFail
}) {
    const [micStatus, setMicStatus] = useState("初始化中...");
    const [heardText, setHeardText] = useState("");
    const [isSuccessFlash, setIsSuccessFlash] = useState(false);
    const [missCount, setMissCount] = useState(0);
    const [missedIndices, setMissedIndices] = useState([]);
    const [countdown, setCountdown] = useState(null); // visual countdown
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const countdownRef = useRef(null);
    const isSpeakingRef = useRef(false);
    const isSuccessFlashRef = useRef(false);
    const missCountRef = useRef(0);
    const isMountedRef = useRef(true);

    const currentBlock = activePhrases[currentSeqIndex] || null;
    const currentBlockRef = useRef(currentBlock);
    const currentSeqIndexRef = useRef(currentSeqIndex);
    const isComplete = currentSeqIndex >= activePhrases.length || !currentBlock;
    const isCompleteRef = useRef(isComplete);

    useEffect(() => {
        currentBlockRef.current = currentBlock;
        currentSeqIndexRef.current = currentSeqIndex;
        isCompleteRef.current = isComplete;
    }, [currentBlock, currentSeqIndex, isComplete]);

    const TTS_LANG = version === 'kjv' ? 'en-US' : (version === 'ja' ? 'ja-JP' : (version === 'ko' ? 'ko-KR' : 'zh-TW'));

    // ──────────────────────────────────────────────
    // MOUNT RESET — clean slate for every new game
    // ──────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        isSpeakingRef.current = false;
        missCountRef.current = 0;
        isSuccessFlashRef.current = false;
        // Kill any lingering TTS from a previous game
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        return () => { isMountedRef.current = false; };
    }, []);

    // ──────────────────────────────────────────────
    // SPEAK SEGMENT — speak text, then ensure mic is alive
    // ──────────────────────────────────────────────
    const speakSegment = async (textToSpeak) => {
        isSpeakingRef.current = true;
        setMicStatus(t("播放中...", "Speaking..."));

        await speakText(textToSpeak, 1.0, TTS_LANG);

        isSpeakingRef.current = false;
        ensureMicAlive();
    };

    // ──────────────────────────────────────────────
    // ENSURE MIC ALIVE — the single source of truth for mic recovery
    // ──────────────────────────────────────────────
    const ensureMicAlive = () => {
        if (!isMountedRef.current) return;
        if (isSpeakingRef.current) return;
        if (recognitionRef.current) {
            // Check if recognition is NOT running — if so, restart it
            try { recognitionRef.current.start(); } catch (e) {
                // InvalidStateError means it's already running — that's fine
            }
        }
        setMicStatus(t("聆聽中...", "Listening..."));
    };

    // ──────────────────────────────────────────────
    // HEARTBEAT — every 2 seconds, check if mic died and revive it
    // ──────────────────────────────────────────────
    useEffect(() => {
        const heartbeat = setInterval(() => {
            if (!isMountedRef.current) return;
            if (isSpeakingRef.current) return;
            if (isCompleteRef.current) return;
            ensureMicAlive();
        }, 2000);
        return () => clearInterval(heartbeat);
    }, []);

    // ──────────────────────────────────────────────
    // TIMER — 5 second countdown per block
    // ──────────────────────────────────────────────
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
            if (isSpeakingRef.current || isCompleteRef.current) return;
            const block = currentBlockRef.current;
            if (block && !isSuccessFlashRef.current) {
                missCountRef.current += 1;
                setMissCount(missCountRef.current);
                setMissedIndices(prev => [...prev, currentSeqIndexRef.current]);

                try { playDing(); } catch (e) { }

                speakSegment(block.text).then(() => {
                    if (!isMountedRef.current) return;
                    if (missCountRef.current >= 3) {
                        speakText(`${t("你已經錯了三次，挑戰失敗。", "You missed 3 times, challenge failed.")} ${t("整段經文是：", "The full verse is:")} ${activeVerse.text}`, 1.0, TTS_LANG).then(() => {
                            if (onFail) onFail();
                        });
                        return;
                    }

                    if (currentSeqIndexRef.current === activePhrases.length - 1) {
                        const total = activePhrases.length;
                        const accuracy = Math.max(0, Math.round(((total - missCountRef.current) / total) * 100));
                        speakText(`${t("正確率", "Accuracy")} ${accuracy}%. ${t("恭喜，你完成了這個經文！", "Congratulations, you completed this verse!")}`, 1.0, TTS_LANG).then(() => {
                            onWordMatch(block);
                        });
                    } else {
                        onWordMatch(block);
                    }
                });
            } else {
                startTimer();
            }
        }, 5000);
    };

    // ──────────────────────────────────────────────
    // 3 DINGS
    // ──────────────────────────────────────────────
    const playThreeDings = () => {
        return new Promise(resolve => {
            let count = 0;
            const interval = setInterval(() => {
                try { playDing(); } catch (e) { }
                count++;
                if (count >= 3) {
                    clearInterval(interval);
                    setTimeout(resolve, 800);
                }
            }, 600);
        });
    };

    // ──────────────────────────────────────────────
    // GAME FLOW — speak reference, play dings, start timer
    // ──────────────────────────────────────────────
    useEffect(() => {
        if (isComplete) return;

        if (currentSeqIndex === 0 && activeVerse) {
            speakSegment(`${t("視障模式", "Blind Mode")}. ${t("出處", "Reference")} ${activeVerse.reference}`).then(() => {
                if (!isMountedRef.current) return;
                return playThreeDings();
            }).then(() => {
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
    }, [currentSeqIndex, activeVerse]);

    // ──────────────────────────────────────────────
    // SPEECH RECOGNITION — setup once, never tear down until unmount
    // ──────────────────────────────────────────────
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
            if (!isSpeakingRef.current) setMicStatus(t("聆聽中...", "Listening..."));
        };

        recognition.onresult = (event) => {
            if (isSpeakingRef.current) return;

            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                currentTranscript += event.results[i][0].transcript;
            }

            if (currentTranscript.trim()) {
                setHeardText(currentTranscript);
                const block = currentBlockRef.current;
                if (block && !isSuccessFlashRef.current) {
                    const cleanTarget = block.text.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
                    const cleanHeard = currentTranscript.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();

                    let isMatch = false;
                    if (cleanHeard.includes(cleanTarget) || cleanTarget.includes(cleanHeard)) {
                        isMatch = true;
                    } else {
                        const heardChars = [...new Set(cleanHeard)];
                        const matchCount = heardChars.filter(c => cleanTarget.includes(c)).length;
                        const requiredMatches = Math.max(1, Math.floor(cleanTarget.length * 0.4));
                        if (matchCount >= requiredMatches) {
                            isMatch = true;
                        }
                    }

                    if (isMatch) {
                        if (timerRef.current) clearTimeout(timerRef.current);
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        setCountdown(null);
                        setHeardText(t("收到正確！等候中...", "Correct! Waiting..."));
                        isSuccessFlashRef.current = true;
                        setIsSuccessFlash(true);

                        speakSegment(block.text).then(() => {
                            if (!isMountedRef.current) return;
                            isSuccessFlashRef.current = false;
                            setIsSuccessFlash(false);
                            if (currentSeqIndexRef.current === activePhrases.length - 1) {
                                const total = activePhrases.length;
                                const accuracy = Math.max(0, Math.round(((total - missCountRef.current) / total) * 100));
                                speakText(`${t("正確率", "Accuracy")} ${accuracy}%. ${t("恭喜，你完成了這個經文！", "Congratulations, you completed this verse!")}`, 1.0, TTS_LANG).then(() => {
                                    onWordMatch(block);
                                });
                            } else {
                                onWordMatch(block);
                            }
                        });
                    }
                }
            }
        };

        recognition.onerror = (e) => {
            console.log("Speech recognition error:", e.error);
            // Don't restart on 'aborted' — that's our own cleanup
            // For all other errors, the heartbeat will handle restart
        };

        recognition.onend = () => {
            // Don't restart here — the heartbeat handles all restarts.
            // This prevents race conditions between onend restarts and speakSegment restarts.
        };

        // Cancel any lingering speech, then start recognition
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        // Start mic immediately — permission dialog will block until granted
        try {
            recognition.start();
        } catch (e) {
            console.error('Initial recognition.start failed:', e);
        }
        recognitionRef.current = recognition;

        return () => {
            isMountedRef.current = false;
            try { recognition.abort(); } catch (e) { }
            recognitionRef.current = null;
        };
    }, [TTS_LANG]);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <h1 style={{ color: '#fff', fontSize: '2rem', position: 'absolute', top: '5%', margin: 0 }}>
                {t("視障模式", "Blind Mode")} - <span style={{ color: '#4ade80' }}>{micStatus}</span>
                {countdown !== null && <span style={{ color: '#facc15', marginLeft: '1rem' }}>⏱ {countdown}s</span>}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', width: '100%', maxHeight: '70vh', overflowY: 'auto', padding: '1rem' }}>
                {activePhrases && activePhrases.map((phrase, index) => {
                    const isActive = index === currentSeqIndex;
                    const isPassed = index < currentSeqIndex;
                    const isMissed = missedIndices.includes(index);
                    const showGold = (isPassed && !isMissed) || (isActive && isSuccessFlash);

                    return (
                        <span
                            key={index}
                            style={{
                                fontSize: '8vw', fontWeight: 'bold', lineHeight: '1.4',
                                color: showGold ? '#fbbf24' : '#475569',
                                border: `2px solid ${showGold ? '#fbbf24' : (isActive ? '#64748b' : '#334155')}`,
                                padding: '0.4rem 1rem',
                                borderRadius: '16px',
                                transition: 'all 0.3s'
                            }}
                        >
                            {phrase.text || phrase}
                        </span>
                    );
                })}
            </div>
            {heardText && (
                <div style={{ position: 'absolute', bottom: '2%', width: '100%', padding: '1rem 2rem', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderTop: '1px solid #334155' }}>
                    <p style={{ color: '#bae6fd', fontSize: '3rem', margin: 0, wordBreak: 'break-word', fontWeight: 'bold' }}>{t("聽見：", "Heard: ")}{heardText}</p>
                </div>
            )}
        </div>
    );
}
