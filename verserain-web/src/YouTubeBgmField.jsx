// YouTubeBgmField — the set editor's 「YouTube 音樂」 option: paste a link, see
// the video in YouTube's own player (so the author finds out right away if the
// owner blocks playing it on other sites), and change it later. The chosen
// video is stored as bgMusic = 'youtube:<id>' (see lib/youtube.js).
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { parseYouTubeId, startYouTubeBgm, youtubeBgmId } from './lib/youtube.js';

function Preview({ t, videoId, volume }) {
  const hostRef = useRef(null);
  const ctrlRef = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    const c = startYouTubeBgm(videoId, volume, hostRef.current, {
      autoplay: false,
      onState: (st) => { if (st === 'error') setFailed(true); },
    });
    ctrlRef.current = c;
    return () => { c._bgmDisconnect(); ctrlRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);
  useEffect(() => { ctrlRef.current?._bgmSetVolume(volume); }, [volume]);
  return (
    <>
      <div ref={hostRef} className="yt-bgm-preview" data-testid="yt-bgm-preview" />
      {failed && (
        <p role="alert" className="yt-bgm-field__error">
          {t('這部影片不允許在其他網站播放，請換一部', 'This video can’t play outside YouTube — try another one')}
        </p>
      )}
    </>
  );
}

export default function YouTubeBgmField({ t, value, volume, onChange }) {
  const videoId = youtubeBgmId(value);
  const [editing, setEditing] = useState(!videoId);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);

  const apply = () => {
    const id = parseYouTubeId(draft);
    if (!id) { setError(true); return; }
    setError(false);
    setDraft('');
    setEditing(false);
    onChange(`youtube:${id}`);
  };

  return (
    <div className="yt-bgm-field" data-testid="yt-bgm-field">
      {videoId && !editing ? (
        <>
          <Preview t={t} videoId={videoId} volume={volume} />
          <div className="yt-bgm-field__row">
            <span className="yt-bgm-field__link">youtu.be/{videoId}</span>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)} data-testid="yt-bgm-change">{t('更換', 'Change')}</Button>
          </div>
        </>
      ) : (
        <div className="yt-bgm-field__row">
          <input
            type="url"
            inputMode="url"
            className="yt-bgm-field__input"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
            placeholder={t('貼上 YouTube 連結', 'Paste a YouTube link')}
            aria-label={t('YouTube 連結', 'YouTube link')}
            aria-invalid={error || undefined}
            data-testid="yt-bgm-input"
          />
          <Button size="sm" onClick={apply} data-testid="yt-bgm-apply">{t('使用', 'Use')}</Button>
          {videoId && <Button variant="text" size="sm" onClick={() => { setEditing(false); setDraft(''); setError(false); }}>{t('取消', 'Cancel')}</Button>}
        </div>
      )}
      {error && <p role="alert" className="yt-bgm-field__error">{t('這不是 YouTube 影片的連結', 'That isn’t a YouTube video link')}</p>}
      <p className="yt-bgm-field__hint">
        {t('播放時角落會有一個小的 YouTube 播放器（YouTube 規定影片要看得到），音樂會自動重複播放。', 'While playing, a small YouTube player sits in a corner (YouTube requires the video to stay visible) and the music repeats.')}
      </p>
    </div>
  );
}
