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
  
  const currentBlock = activePhrases[currentSeqIndex] || null;
  const isComplete = currentSeqIndex >= activePhrases.length || !currentBlock;
  
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
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
       if (isSpeakingRef.current) return; // don't timeout while speaking
       if (currentBlock) {
           setMissCount(m => m + 1);
           playDing();
           speakSegment(currentBlock.text).then(() => {
              startTimer(); // reset timer
           });
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
    
    return () => clearInterval(timerRef.current);
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

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setHeardText(event.results[i][0].transcript);
        }
      }
      
      if (finalTranscript) {
        setHeardText(finalTranscript);
        // Process match
        if (currentBlock && !isSuccessFlash) {
            const cleanTarget = currentBlock.text.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
            const cleanHeard = finalTranscript.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
            
            if (cleanHeard.includes(cleanTarget) || cleanTarget.includes(cleanHeard)) {
                // Match!
                clearInterval(timerRef.current);
                setHeardText(""); // clear
                setIsSuccessFlash(true);
                speakSegment(currentBlock.text).then(() => {
                     setIsSuccessFlash(false);
                     if (currentSeqIndex === activePhrases.length - 1) {
                         const total = activePhrases.length;
                         const accuracy = Math.max(0, Math.round(((total - missCount) / total) * 100));
                         speakText(`${t("正確率", "Accuracy")} ${accuracy}%. ${t("恭喜，你完成了這個經文！", "Congratulations, you completed this verse!")}`, 1.0, TTS_LANG).then(() => {
                             onWordMatch(currentBlock);
                         });
                     } else {
                         onWordMatch(currentBlock);
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
      if (!isComplete && !isSpeakingRef.current) {
         try { recognition.start(); } catch (e) {}
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
  }, [currentBlock, isComplete, TTS_LANG, isSuccessFlash]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
       <h1 style={{ color: '#fff', fontSize: '2rem', position: 'absolute', top: '10%' }}>{t("視障模式", "Blind Mode")} - <span style={{color: '#4ade80'}}>{micStatus}</span></h1>
       {currentBlock && (
           <div style={{ fontSize: '15vw', fontWeight: 'bold', color: isSuccessFlash ? '#fbbf24' : '#fff', textAlign: 'center', wordBreak: 'break-word', lineHeight: '1.2', transition: 'color 0.3s' }}>
              {currentBlock.text}
           </div>
       )}
       {heardText && (
           <p style={{ color: '#94a3b8', fontSize: '2.5rem', position: 'absolute', bottom: '10%', textAlign: 'center' }}>{heardText}</p>
       )}
    </div>
  );
}
