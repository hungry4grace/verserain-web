import React, { useEffect, useState, useRef } from 'react';

export default function BlindModeGame({
  activeVerse,
  activePhrases,
  currentSeqIndex,
  onWordMatch,
  speakText,
  playDing,
  version,
  t
}) {
  const [micStatus, setMicStatus] = useState("初始化中...");
  const [heardText, setHeardText] = useState("");
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const [missCount, setMissCount] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isSuccessFlashRef = useRef(false);
  const missCountRef = useRef(0);
  
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

  const speakSegment = async (textToSpeak) => {
      isSpeakingRef.current = true;
      try {
          if (recognitionRef.current) {
             try { recognitionRef.current.abort(); } catch(e){}
          }
      } catch(e) {}
      
      await speakText(textToSpeak, 1.0, TTS_LANG);
      isSpeakingRef.current = false;
      
      try {
          if (recognitionRef.current) {
             recognitionRef.current.start();
          }
      } catch(e){}
  };

  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
       if (isSpeakingRef.current || isCompleteRef.current) return;
       const block = currentBlockRef.current;
       if (block && !isSuccessFlashRef.current) {
           missCountRef.current += 1;
           setMissCount(missCountRef.current);
           try { playDing(); } catch(e){}
           
           speakSegment(block.text).then(() => {
               // Advance automatically if they fail the timeout Timeout means they get moving forward!
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

  useEffect(() => {
    if (isComplete) return;

    // Speak verse reference on start
    if (currentSeqIndex === 0 && activeVerse) {
      speakSegment(`${t("視障模式", "Blind Mode")}. ${t("出處", "Reference")} ${activeVerse.reference}`).then(() => {
          startTimer();
      });
    } else if (currentBlock) {
      startTimer();
    }
    
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentSeqIndex, activeVerse]);

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
        // Process match against EVERY interim result! Much more responsive.
        const block = currentBlockRef.current;
        if (block && !isSuccessFlashRef.current) {
            const cleanTarget = block.text.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
            const cleanHeard = currentTranscript.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
            
            let isMatch = false;
            if (cleanTarget.length >= 2) {
                const firstTwo = cleanTarget.substring(0, 2);
                if (cleanHeard.includes(firstTwo)) isMatch = true;
            } else if (cleanTarget.length === 1) {
                if (cleanHeard.includes(cleanTarget)) isMatch = true;
            }
            
            if (isMatch || cleanHeard.includes(cleanTarget) || cleanTarget.includes(cleanHeard)) {
                // Match!
                if (timerRef.current) clearTimeout(timerRef.current);
                setHeardText(t("收到正確！等候中...", "Correct! Waiting...")); // clear
                isSuccessFlashRef.current = true;
                setIsSuccessFlash(true);
                
                speakSegment(block.text).then(() => {
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
      if (e.error !== 'aborted') {
          setMicStatus(t("重新啟動麥克風...", "Restarting mic..."));
          setTimeout(() => {
            if (!isSpeakingRef.current) {
               try { recognition.start(); } catch (err) {}
            }
          }, 1000);
      }
    };

    recognition.onend = () => {
      if (!isCompleteRef.current && !isSpeakingRef.current) {
         setTimeout(() => {
             try { recognition.start(); } catch (e) {}
         }, 300); // Slight delay to prevent aggressive Safari throttling
      }
    };

    if (!isSpeakingRef.current) {
        try {
           recognition.start();
           recognitionRef.current = recognition;
        } catch (e) {
           console.error(e);
        }
    } else {
        recognitionRef.current = recognition;
    }

    return () => {
       try { recognition.stop(); } catch(e) {}
    };
  }, [TTS_LANG]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
       <h1 style={{ color: '#fff', fontSize: '2rem', position: 'absolute', top: '5%', margin: 0 }}>{t("視障模式", "Blind Mode")} - <span style={{color: '#4ade80'}}>{micStatus}</span></h1>
       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', width: '100%', maxHeight: '70vh', overflowY: 'auto', padding: '1rem' }}>
           {activePhrases && activePhrases.map((phrase, index) => {
               const isActive = index === currentSeqIndex;
               const isPassed = index < currentSeqIndex;
               const showGold = isPassed || (isActive && isSuccessFlash);
               
               return (
                   <span 
                      key={index} 
                      style={{ 
                         fontSize: '8vw', fontWeight: 'bold', lineHeight: '1.4',
                         color: showGold ? '#fbbf24' : '#475569', 
                         border: `2px solid ${showGold ? '#fbbf24' : '#334155'}`,
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
           <div style={{ position: 'absolute', bottom: '5%', width: '100%', padding: '0 2rem', textAlign: 'center' }}>
               <p style={{ color: '#94a3b8', fontSize: '2.5rem', margin: 0, wordBreak: 'break-word' }}>聽見：{heardText}</p>
           </div>
       )}
    </div>
  );
}
