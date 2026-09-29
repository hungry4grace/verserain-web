// YouTube as a set's background music (bgMusic = 'youtube:<videoId>').
//
// YouTube's API terms forbid playing a video's sound on its own, so the video
// plays in YouTube's own embedded player, kept visible in a corner (at least
// 200×200px, per the IFrame API rules). startYouTubeBgm returns an object
// shaped like the <audio> from startLoopingBgm (play / pause / _bgmSetVolume /
// _bgmDisconnect), so the rain player's pause and resume code drives it as is.

// Accepts youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, /live/ID,
// music.youtube.com and m.youtube.com links, or a bare 11-character id.
export function parseYouTubeId(input) {
  const s = String(input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let url;
  try { url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return ''; }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') || '';
    if (!id) {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      id = m ? m[1] : '';
    }
  }
  return /^[\w-]{11}$/.test(id) ? id : '';
}

export const youtubeBgmId = (choice) => {
  const s = String(choice || '');
  return s.startsWith('youtube:') ? s.slice('youtube:'.length) : '';
};

let apiPromise = null;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiPromise = null; s.remove(); reject(new Error('YouTube API failed to load')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

// onState(state) gets YouTube's player state (-1 unstarted, 0 ended, 1 playing,
// 2 paused, 3 buffering, 5 cued) or 'error' (with YouTube's error code: 101 and
// 150 mean the owner does not allow embedding).
export function startYouTubeBgm(videoId, volume, host, { autoplay = true, onState } = {}) {
  let player = null;
  let ready = false;
  let dead = false;
  let wantPlay = autoplay;
  let gain = volume;
  // The stored volume is a 0–1 gain (see bgmSliderToGain); YouTube takes 0–100.
  const ytVolume = () => Math.round(Math.min(1, Math.max(0, gain ?? 0.18)) * 100);
  const wrap = document.createElement('div');
  wrap.className = 'yt-bgm-frame';
  const el = document.createElement('div');
  wrap.appendChild(el);
  host.appendChild(wrap);

  loadYouTubeApi().then((YT) => {
    if (dead) return;
    player = new YT.Player(el, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { autoplay: autoplay ? 1 : 0, loop: 1, playlist: videoId, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          if (dead) return;
          ready = true;
          player.setVolume(ytVolume());
          if (wantPlay) player.playVideo();
        },
        onStateChange: (e) => {
          // loop=1 needs the playlist trick and still stops on some videos, so
          // restart by hand as well.
          if (e.data === 0 && wantPlay) { player.seekTo(0, true); player.playVideo(); }
          onState?.(e.data);
        },
        onError: (e) => onState?.('error', e.data),
      },
    });
  }).catch(() => onState?.('error', 0));

  return {
    src: `https://youtu.be/${videoId}`,
    play() {
      wantPlay = true;
      if (ready) player.playVideo();
      return Promise.resolve();
    },
    pause() {
      wantPlay = false;
      if (ready) player.pauseVideo();
    },
    _bgmSetVolume(v) {
      gain = v;
      if (ready) player.setVolume(ytVolume());
    },
    _bgmDisconnect() {
      dead = true;
      try { player?.destroy(); } catch { /* noop */ }
      wrap.remove();
    },
  };
}
