// The 一起玩 (multiplayer) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BookOpen, CloudRain, Crown, Dices, Headphones, Heart, Info, Library, MapPin, Search, Star, Trophy, Users, X, XCircle, Zap } from 'lucide-react';
import { Button, ListGroup, ListRow } from '../ui';
import { QRCodeSVG } from 'qrcode.react';
import { TEAM_OPTIONS, canStartTeamMatch, createRoomCode, getRoomColor, getTeamById, sanitizeRoomCode } from '../lib/rooms.js';
import { buildPublicShareUrl } from '../lib/routes.js';
import { formatVerseReferenceForDisplay } from '../lib/verseDisplay.js';

export default function MultiplayerPage({ t, activeVerseSets, customVerseSets, fetchGlobalLeaderboard, isGuestJoinRef, joinRoomError, joinRoomTimeoutRef, mpLocalRefFor, mpLocalTextFor, multiplayerDistractionLevel, multiplayerHostPlays, multiplayerPlayMode, multiplayerRoomId, multiplayerRoomMode, multiplayerSearchText, multiplayerSelectedVerses, multiplayerState, multiplayerTeamCount, myClientId, personalCode, pickerLockedSet, pickerSelectedSet, playerName, randomPickCount, setActiveVerse, setDistractionLevel, setInitAutoStart, setJoinRoomError, setMainTab, setMultiplayerDistractionLevel, setMultiplayerHostPlays, setMultiplayerPlayMode, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, setMultiplayerSearchText, setMultiplayerSelectedVerses, setMultiplayerState, setMultiplayerTeamCount, setPickerLockedSet, setPickerSelectedSet, setPlayerName, setPlayMode, setRandomPickCount, setShowMultiplayerVersePicker, setShowPickerBrowser, showMultiplayerVersePicker, showPickerBrowser, socketRef, version }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
      {!multiplayerRoomId && (
        <div data-testid="play-links" style={{ textAlign: 'left', marginBottom: 'var(--space-5)' }}>
          <ListGroup>
            <ListRow testId="play-map" icon={<MapPin size={24} />} iconColor="#0ea5e9" title={t('誰在玩', "Who's Playing")} desc={t('全球玩家地圖：看看誰正在背經，雙擊房間直接加入', 'Global player map: see who is memorising now, double-tap a room to join')} onClick={() => setMainTab('map')} />
            <ListRow testId="play-leaderboard" icon={<Trophy size={24} />} iconColor="#f59e0b" title={t('排行榜', 'Leaderboard')} desc={t('看看大家的成績', "See everyone's scores")} onClick={() => { setMainTab('leaderboard'); fetchGlobalLeaderboard(); }} />
            <ListRow testId="play-contests" icon={<BookOpen size={24} />} iconColor="#16a34a" title={t('讀經比賽', 'Reading contest')} desc={t('參加或舉辦讀經比賽', 'Join or host a reading contest')} onClick={() => setMainTab('contests')} />
          </ListGroup>
        </div>
      )}
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontFamily: 'var(--app-font-family)', color: '#8b5cf6' }}>{(multiplayerState?.matchType === 'individual' || multiplayerRoomMode === 'individual') ? t("邀人對戰", "Invite to a duel") : t("多人遊戲", "Multiplayer")}</h2>

      {!playerName ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
          <h3 style={{ color: '#475569', margin: 0, fontSize: '1.5rem' }}>{t("請先告訴我們你的名字！", "First, what's your name?")}</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>{t("選一個頭像，或直接輸入文字", "Pick an avatar, or just type your name")}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '350px' }}>
            {[
              { id: 'brave', label: t('勇敢', 'Brave'), Icon: Crown, color: '#f59e0b' },
              { id: 'joy', label: t('喜樂', 'Joy'), Icon: Star, color: '#f97316' },
              { id: 'team', label: t('隊友', 'Teammate'), Icon: Users, color: '#3b82f6' },
              { id: 'quick', label: t('快手', 'Quick'), Icon: Zap, color: '#eab308' },
              { id: 'learner', label: t('學習', 'Learner'), Icon: Library, color: '#8b5cf6' },
              { id: 'love', label: t('愛心', 'Love'), Icon: Heart, color: '#ef4444' },
              { id: 'listener', label: t('聆聽', 'Listener'), Icon: Headphones, color: '#06b6d4' },
              { id: 'rain', label: t('雨滴', 'Rain'), Icon: CloudRain, color: '#0ea5e9' }
            ].map(({ id, label, Icon, color }) => (
              <button key={id} type="button" className="block-tile" onClick={() => {
                const input = document.getElementById('guestNameInput');
                if (input) {
                  input.value = label;
                  input.focus();
                }
              }} style={{ cursor: 'pointer', padding: '0.65rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color, minWidth: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <Icon size={26} />
                <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>{label}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '300px', marginTop: '1rem' }}>
            <input id="guestNameInput" type="text" placeholder={t("你的暱稱", "Your nickname")} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 'bold', boxSizing: 'border-box' }} onKeyDown={(e) => {
              if (e.key === 'Enter') document.getElementById('guestNameBtn')?.click();
            }} />
            <Button id="guestNameBtn" size="lg" block onClick={() => {
              const val = document.getElementById('guestNameInput').value.trim();
              if (val) {
                setPlayerName(val);
                localStorage.setItem('verserain_player_name', val);
              }
            }}>{t("出發！", "Go!")}</Button>
          </div>
        </div>
      ) : !multiplayerRoomId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '-1rem', color: 'var(--color-text)' }}>{playerName.substring(0, 2)}</div>
          <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '520px', lineHeight: 1.6 }}>{t("老師先選擇隊伍數量，再建立房間。學生加入一個聖靈果子隊伍，最後用隊伍平均分排名。", "The teacher chooses the number of teams, then hosts a room. Students join a Fruit of the Spirit team, and final standings are ranked by team average score.")}</p>

          <div style={{ width: '100%', maxWidth: '520px', background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '12px', padding: '1rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <label htmlFor="teamCountSelect" style={{ color: '#334155', fontWeight: 'bold' }}>{t("隊伍數量", "Number of Teams")}</label>
              <select
                id="teamCountSelect"
                value={multiplayerTeamCount}
                onChange={(e) => setMultiplayerTeamCount(Number(e.target.value))}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}
              >
                {Array.from({ length: 8 }, (_, i) => i + 2).map(count => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: '0.5rem' }}>
              {TEAM_OPTIONS.slice(0, multiplayerTeamCount).map(team => (
                <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.55rem', background: 'white', border: `1px solid ${team.color}55`, borderRadius: '8px', color: '#334155', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />
                  <span>{t(team.name, team.enName)}</span>
                </div>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', maxWidth: '300px', padding: '0.7rem 0.9rem', background: multiplayerHostPlays ? '#eff6ff' : '#f8fafc', border: `1px solid ${multiplayerHostPlays ? '#93c5fd' : '#e2e8f0'}`, borderRadius: '8px', cursor: 'pointer', color: '#334155', fontWeight: 'bold', fontSize: '0.92rem' }}>
            <input
              type="checkbox"
              checked={multiplayerHostPlays}
              onChange={(e) => setMultiplayerHostPlays(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer', flex: '0 0 auto' }}
            />
            <span style={{ textAlign: 'left', lineHeight: 1.3 }}>
              {t("我也要一起比賽", "I'll play too")}
              <span style={{ display: 'block', fontWeight: 'normal', color: '#94a3b8', fontSize: '0.78rem' }}>
                {t("關閉則只當主持人（不計分）", "Off = host only, you won't compete")}
              </span>
            </span>
          </label>

          <Button size="lg" block style={{ maxWidth: '300px' }} onClick={() => {
              const newRoom = createRoomCode();
              setMultiplayerRoomMode('team');
              setMultiplayerRoomRole('host');
              setMultiplayerRoomId(newRoom);
            }}>
            {t("建立房間 (Host Game)", "Create Room")}
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            <span style={{ padding: '0 1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{t("或", "OR")}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
            <input
              id="joinRoomInput"
              type="text"
              placeholder={t("輸入房間代碼", "Enter Room Code")}
              maxLength={4}
              inputMode="latin"
              autoCapitalize="characters"
              style={{ flex: 1, minWidth: 0, padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', textTransform: 'uppercase', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
              onChange={(e) => e.target.value = sanitizeRoomCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('joinRoomBtn')?.click(); }}
            />
            <Button id="joinRoomBtn" variant="secondary" onClick={() => {
                const code = sanitizeRoomCode(document.getElementById('joinRoomInput')?.value);
                if (code && code.length === 4) {
                  const roomCode = code.substring(0, 4);
                  setJoinRoomError(null);
                  isGuestJoinRef.current = true;
                  setMultiplayerRoomMode(null);
                  setMultiplayerRoomRole('player');
                  setMultiplayerRoomId(roomCode);
                  // Start 5s timeout — if no STATE_UPDATE arrives, room likely doesn't exist
                  if (joinRoomTimeoutRef.current) clearTimeout(joinRoomTimeoutRef.current);
                  joinRoomTimeoutRef.current = setTimeout(() => {
                    if (isGuestJoinRef.current) {
                      setJoinRoomError(roomCode);
                      setMultiplayerRoomMode(null);
                      setMultiplayerRoomRole('player');
                      setMultiplayerRoomId(null);
                      isGuestJoinRef.current = false;
                    }
                  }, 5000);
                }
              }}>
              {t("加入", "Join")}
            </Button>
          </div>

          {joinRoomError && (
            <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '0.95rem' }}>
                  {t('找不到房間「{room}」', 'Room "{room}" not found').replace('{room}', String(joinRoomError))}
                </div>
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '2px' }}>
                  {t('請確認房間代碼是否正確', 'Please check the room code and try again')}
                </div>
              </div>
              <button onClick={() => setJoinRoomError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}><X size={16} /></button>
            </div>
          )}
        </div>
      ) : multiplayerState?.status === 'ready_check' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '2px dashed #d946ef', width: '100%', maxWidth: '460px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#86198f' }}>{multiplayerState.matchType === 'team' ? t("多人遊戲準備！", "Multiplayer Ready!") : t("準備比賽！", "Get Ready!")}</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: getRoomColor(multiplayerRoomId) || '#3b82f6', letterSpacing: '6px', marginBottom: '0.5rem', background: (getRoomColor(multiplayerRoomId) || '#3b82f6') + '18', borderRadius: '6px', padding: '0.3rem 1rem', display: 'inline-block', border: `2px solid ${getRoomColor(multiplayerRoomId) || '#3b82f6'}` }}>{multiplayerRoomId}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.8rem 0' }}>{t("分享此代碼讓更多人加入", "Share this code to let others join")}</p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <QRCodeSVG value={buildPublicShareUrl(window.location.pathname, { room: multiplayerRoomId, ref: personalCode })} size={100} />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{t("或掃描此 QR Code 快速加入", "or scan QR to join")}</p>
            </div>
            {(() => {
              // *_solo: preview verse 0 in the player's own language (text localizes
              // once fetched; the reference label localizes instantly).
              const solo = multiplayerRoomId && multiplayerState.playMode?.endsWith('_solo');
              const refLabel = solo ? mpLocalRefFor(multiplayerState.verseRef) : multiplayerState.verseRef;
              const previewText = solo ? mpLocalTextFor(multiplayerState.verseRef, multiplayerState.verseText) : multiplayerState.verseText;
              return (<>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c026d3', marginBottom: '0.5rem' }}>{refLabel}</div>
                <div style={{ fontSize: '1rem', color: '#701a75', marginBottom: '1rem', fontStyle: 'italic', maxWidth: '300px', lineHeight: '1.4' }}>"{previewText}"</div>
              </>);
            })()}
            <p style={{ color: '#a21caf', fontSize: '0.9rem', margin: 0 }}>{multiplayerState.matchType === 'team' ? t("選好隊伍並準備後，老師就可以開始。", "Choose a team, get ready, then the teacher can start.") : t("雙方準備就緒後即將開始", "Match starts when both are ready")}</p>
          </div>

          {multiplayerState.matchType === 'team' && multiplayerState.players[myClientId] && (
            <div style={{ width: '100%', maxWidth: '520px', background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '12px', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155', textAlign: 'left' }}>{t("選擇你的隊伍", "Choose Your Team")}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                {(multiplayerState.teams || TEAM_OPTIONS).map(team => {
                  const selected = multiplayerState.players[myClientId]?.teamId === team.id;
                  const locked = Boolean(multiplayerState.players[myClientId]?.teamId);
                  const members = Object.values(multiplayerState.players || {}).filter(p => p.connected && p.teamId === team.id);
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        if (!locked && socketRef.current) socketRef.current.send(JSON.stringify({ type: 'SELECT_TEAM', teamId: team.id }));
                      }}
                      disabled={locked}
                      style={{ border: `2px solid ${selected ? team.color : '#e2e8f0'}`, background: selected ? `${team.color}18` : 'white', borderRadius: '10px', padding: '0.9rem', cursor: locked ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', opacity: locked && !selected ? 0.55 : 1 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />
                        <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>{t(team.name, team.enName || team.name)}</span>
                      </span>
                      <span style={{ color: selected ? team.color : '#64748b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{selected ? t("已選", "Picked") : `${members.length}`}</span>
                    </button>
                  );
                })}
              </div>
              {multiplayerState.players[myClientId]?.teamId && (
                <p style={{ margin: '0.75rem 0 0 0', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>{t("隊伍已鎖定，請按準備。", "Team locked. Press ready when you are set.")}</p>
              )}
            </div>
          )}

          {multiplayerState.matchType === 'team' && multiplayerState.host === myClientId && !multiplayerState.players[myClientId] && (
            <div style={{ width: '100%', maxWidth: '520px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
              {(multiplayerState.teams || TEAM_OPTIONS).map(team => {
                const members = Object.values(multiplayerState.players || {}).filter(p => p.connected && p.teamId === team.id);
                return (
                  <div key={team.id} style={{ background: `${team.color}12`, border: `1px solid ${team.color}55`, borderRadius: '10px', padding: '0.85rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />{t(team.name, team.enName || team.name)}</strong>
                      <span style={{ color: team.color, fontWeight: 'bold' }}>{members.length}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', minHeight: '1.2rem' }}>
                      {members.length > 0 ? members.map(p => p.name).join('、') : t("等待加入", "Waiting")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {multiplayerState.host !== myClientId && !multiplayerState.players[myClientId]?.isReady && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#3b82f6', fontWeight: 'bold', fontSize: '1.05rem', backgroundColor: '#eff6ff', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Info size={18} /> {multiplayerState.matchType === 'team' && !multiplayerState.players[myClientId]?.teamId ? t("請先選一個隊伍", "Choose one team first") : t("如果你準備好了，請按下「我準備好了」的鍵", "If you are ready, please press the 'I am ready' button")}
            </div>
          )}

          {multiplayerState.matchType === 'team' && multiplayerState.host === myClientId && multiplayerState.players[myClientId] && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#15803d', fontWeight: 'bold', fontSize: '1.05rem', backgroundColor: '#f0fdf4', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Info size={18} /> {!multiplayerState.players[myClientId]?.teamId ? t("你是主持人並一起參賽 — 請先選一個隊伍，再按「比賽開始」", "You're hosting and competing — choose a team first, then press Start") : t("你是主持人並一起參賽，準備好就按「比賽開始」", "You're hosting and competing — press Start when ready")}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0 1.5rem 0', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => {
                if (socketRef.current) socketRef.current.close();
                setMultiplayerRoomMode(null);
                setMultiplayerRoomRole('player');
                setMultiplayerRoomId(null);
                setMultiplayerState(null);
              }}>
              {t("離開", "Leave")}
            </Button>

            {multiplayerState.host === myClientId ? (
              <Button size="lg" disabled={multiplayerState.matchType === 'team' && (!canStartTeamMatch(multiplayerState) || (multiplayerState.players[myClientId] && !multiplayerState.players[myClientId].teamId))} onClick={() => {
                  if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'HOST_START_GAME' }));
                }}>
                {t("比賽開始", "Start Game")}
              </Button>
            ) : (
              <Button size="lg" disabled={multiplayerState.players[myClientId]?.isReady || (multiplayerState.matchType === 'team' && !multiplayerState.players[myClientId]?.teamId)} onClick={() => {
                  if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'PLAYER_READY' }));
                }}>
                {multiplayerState.players[myClientId]?.isReady ? t("✔️ 已準備", "✔️ Ready") : t("我準備好了", "I am ready")}
              </Button>
            )}
          </div>

          <div style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}>
            <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>{t("玩家狀態:", "Player Status:")}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.values(multiplayerState.players).map(p => {
                const team = getTeamById(p.teamId, multiplayerState.teams);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', backgroundColor: p.isReady ? '#dcfce7' : '#f1f5f9', borderRadius: '6px', border: p.isReady ? '1px solid #86efac' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0 }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: team?.color || p.color, boxShadow: '0 0 0 2px white, 0 0 0 4px ' + (team?.color || p.color) }}></div>
                      <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem', minWidth: 0 }}>{p.name} {multiplayerState.host === p.id ? '(Host)' : ''}</span>
                      {team && <span style={{ color: team.color, background: `${team.color}16`, border: `1px solid ${team.color}55`, borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{t(team.name, team.enName || team.name)}</span>}
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: p.isReady ? '#15803d' : '#94a3b8', whiteSpace: 'nowrap' }}>
                      {p.isReady ? t("✔️ 已準備", "✔️ READY") : t("等待中...", "WAITING")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : showMultiplayerVersePicker && multiplayerState?.host === myClientId ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '500px', textAlign: 'left', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#334155' }}>
              {pickerSelectedSet ? pickerSelectedSet.title : t("選擇比賽經文組", "Select Verse Group")}
            </h3>
            <button onClick={() => setShowMultiplayerVersePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', color: '#475569', minWidth: '80px' }}>{t("遊戲模式", "Game Mode")}:</label>
              <select
                value={multiplayerPlayMode}
                onChange={(e) => setMultiplayerPlayMode(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', flex: 1, backgroundColor: '#fff', fontSize: '1rem', outline: 'none' }}
              >
                <option value="square_solo">{t("獨立九宮格 (Solo Square)", "Solo Square")}</option>
                <option value="rain_solo">{t("雨滴瀑布 (VerseRain)", "VerseRain")}</option>
                <option value="voice_solo">{t('語音模式 (Voice Mode)', 'Voice Mode')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', color: '#475569', minWidth: '80px' }}>{t("難度級別", "Difficulty")}:</label>
              <select
                value={multiplayerDistractionLevel}
                onChange={(e) => setMultiplayerDistractionLevel(Number(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', flex: 1, backgroundColor: '#fff', fontSize: '1rem', outline: 'none' }}
              >
                <option value={0}>{t("等級 0 (無干擾方塊，2x2)", "Level 0 (No fakes, 2x2)")}</option>
                <option value={1}>{t("等級 1 (少量干擾，2x2)", "Level 1 (Few fakes, 2x2)")}</option>
                <option value={2}>{t("等級 2 (中等干擾，3x3)", "Level 2 (Medium fakes, 3x3)")}</option>
                <option value={3}>{t("等級 3 (極限干擾，3x3)", "Level 3 (Max fakes, 3x3)")}</option>
              </select>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div style={{ marginBottom: '1rem', display: pickerLockedSet ? 'none' : undefined }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center' }}><Search size={18} /></span>
              <input
                id="mpVerseSearchInput"
                type="text"
                placeholder={t("搜尋經文（書卷、章節、內文…）", "Search verses (book, chapter, text…)")}
                value={multiplayerSearchText}
                onChange={(e) => { setMultiplayerSearchText(e.target.value); setPickerSelectedSet(null); }}
                autoFocus
                style={{ width: '100%', padding: '0.75rem 0.9rem 0.75rem 2.4rem', borderRadius: '8px', border: '2px solid #a78bfa', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 3px #ede9fe' }}
              />
              {multiplayerSearchText && (
                <button onClick={() => setMultiplayerSearchText('')} style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: '0' }}><X size={18} /></button>
              )}
            </div>
          </div>

          {/* ── Search Results ── */}
          {multiplayerSearchText.trim().length > 0 ? (() => {
            const q = multiplayerSearchText.trim().toLowerCase();
            const verseResults = [];
            const setResults = [];
            for (const set of activeVerseSets) {
              if ((set.title || '').toLowerCase().includes(q)) {
                setResults.push(set);
              }
              for (const v of (set.verses || [])) {
                if (
                  (v.reference || '').toLowerCase().includes(q) ||
                  (v.title || '').toLowerCase().includes(q) ||
                  (v.text || '').toLowerCase().includes(q)
                ) {
                  if (!verseResults.some(r => r.reference === v.reference)) verseResults.push(v);
                }
              }
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                    {(setResults.length > 0 || verseResults.length > 0) ? `${t('找到', 'Found')} ${setResults.length > 0 ? setResults.length + ' ' + t('個經文組', 'sets') + (verseResults.length > 0 ? ' , ' : '') : ''}${verseResults.length > 0 ? verseResults.length + ' ' + t('節經文', 'verses') : ''}` : t('找不到符合的項目', 'No matches found')}
                  </span>
                  {multiplayerSelectedVerses.length > 0 && (
                    <button
                      onClick={() => {
                        setActiveVerse(multiplayerSelectedVerses[0]);
                        setPlayMode(multiplayerPlayMode);
                        setDistractionLevel(multiplayerDistractionLevel);
                        setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: multiplayerSelectedVerses, verse: multiplayerSelectedVerses[0], playMode: multiplayerPlayMode });
                        setShowMultiplayerVersePicker(false); setPickerLockedSet(false);
                      }}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      ✓ {t('完成揀選', 'Finish')} ({multiplayerSelectedVerses.length})
                    </button>
                  )}
                </div>

                {/* Matching Verse Sets */}
                {setResults.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.7rem', marginBottom: '1rem' }}>
                    {setResults.map(set => (
                      <button
                        key={set.id}
                        onClick={() => { setPickerSelectedSet(set); setMultiplayerSearchText(''); setShowPickerBrowser(true); }}
                        style={{ padding: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s', fontSize: '0.9rem' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#ede9fe'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          {customVerseSets.some(c => c.id === set.id) && <Crown size={16} />}
                          {set.title}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 'normal' }}>{set.verses?.length || 0} {t('節', 'verses')}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Matching Verses */}
                {verseResults.length > 0 && (
                  <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.3rem' }}>
                    {verseResults.slice(0, 80).map(v => {
                      const isSelected = multiplayerSelectedVerses.some(sv => sv.reference === v.reference);
                      return (
                        <div
                          key={v.reference}
                          onClick={() => {
                            if (isSelected) {
                              setMultiplayerSelectedVerses(prev => prev.filter(sv => sv.reference !== v.reference));
                            } else {
                              setMultiplayerSelectedVerses(prev => [...prev, v]);
                            }
                          }}
                          style={{ padding: '0.8rem 1rem', border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`, borderRadius: '8px', background: isSelected ? '#ecfdf5' : '#fafafa', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem', transition: 'all 0.15s' }}
                          onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = isSelected ? '#10b981' : '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '1rem' }}>{formatVerseReferenceForDisplay(v.reference, version)}</span>
                            {isSelected && <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</span>}
                          </div>
                          {v.title && <span style={{ fontSize: '0.85rem', color: '#475569' }}>{v.title}</span>}
                          {v.text && <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.text}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })() : (
            /* ── Browse by Set (collapsed by default) ── */
            <div>
              {!pickerLockedSet && <button
                onClick={() => setShowPickerBrowser(v => !v)}
                style={{ width: '100%', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0.75rem 1rem', cursor: 'pointer', color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.95rem' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Library size={16} /> {t('瀏覽經文組', 'Browse Verse Sets')}</span>
                <span style={{ fontSize: '0.8rem' }}>{showPickerBrowser ? '▲' : '▼'}</span>
              </button>}
              {showPickerBrowser && (
                !pickerSelectedSet ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.7rem', maxHeight: '340px', overflowY: 'auto', marginTop: '0.75rem' }}>
                    {activeVerseSets.map(set => (
                      <button
                        key={set.id}
                        onClick={() => setPickerSelectedSet(set)}
                        style={{ padding: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s', fontSize: '0.9rem' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#ede9fe'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          {customVerseSets.some(c => c.id === set.id) && <Crown size={16} />}
                          {set.title}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 'normal' }}>{set.verses?.length || 0} {t('節', 'verses')}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.3rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      {!pickerLockedSet && <button onClick={() => { setPickerSelectedSet(null); setMultiplayerSelectedVerses([]); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0' }}>
                        <span>←</span> {t('返回經文組', 'Back to Groups')}
                      </button>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{t('隨機', 'Rand')} ({pickerSelectedSet.verses?.length || 0})</span>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                            <button onClick={() => setRandomPickCount(Math.max(1, (parseInt(randomPickCount) || 1) - 1))} style={{ width: '24px', height: '24px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transform: 'none' }}>-</button>
                            <input type="number" min="1" max={pickerSelectedSet.verses?.length || 1} value={randomPickCount || 1} onChange={(e) => setRandomPickCount(e.target.value === '' ? '' : Math.min(pickerSelectedSet.verses?.length || 1, Math.max(1, parseInt(e.target.value))))} style={{ width: '36px', height: '24px', padding: '0', border: 'none', background: 'white', outline: 'none', textAlign: 'center', fontSize: '0.9rem', color: '#334155', fontWeight: 'bold', margin: '0' }} />
                            <button onClick={() => setRandomPickCount(Math.min(pickerSelectedSet.verses?.length || 1, (parseInt(randomPickCount) || 1) + 1))} style={{ width: '24px', height: '24px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transform: 'none' }}>+</button>
                          </div>
                          <button onClick={() => { if (!pickerSelectedSet?.verses) return; const sel = [...pickerSelectedSet.verses].sort(() => 0.5 - Math.random()).slice(0, randomPickCount); setActiveVerse(sel[0]); setPlayMode(multiplayerPlayMode); setDistractionLevel(multiplayerDistractionLevel); setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: sel, verse: sel[0], playMode: multiplayerPlayMode }); setShowMultiplayerVersePicker(false); setPickerLockedSet(false); }} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}><Dices size={13} /> {t('開始', 'Start')}</button>
                        </div>
                        {multiplayerSelectedVerses.length > 0 && (
                          <button onClick={() => { setActiveVerse(multiplayerSelectedVerses[0]); setPlayMode(multiplayerPlayMode); setDistractionLevel(multiplayerDistractionLevel); setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: multiplayerSelectedVerses, verse: multiplayerSelectedVerses[0], playMode: multiplayerPlayMode }); setShowMultiplayerVersePicker(false); setPickerLockedSet(false); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                            ✓ {t('完成揀選', 'Finish')} ({multiplayerSelectedVerses.length})
                          </button>
                        )}
                      </div>
                    </div>
                    {pickerSelectedSet.verses?.map(v => {
                      const isSelected = multiplayerSelectedVerses.some(sv => sv.reference === v.reference);
                      return (
                        <div key={v.reference} onClick={() => { if (isSelected) { setMultiplayerSelectedVerses(prev => prev.filter(sv => sv.reference !== v.reference)); } else { setMultiplayerSelectedVerses(prev => [...prev, v]); } }} style={{ padding: '0.8rem 1rem', border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`, borderRadius: '8px', background: isSelected ? '#ecfdf5' : '#fafafa', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem', transition: 'all 0.15s' }} onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#a78bfa'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = isSelected ? '#10b981' : '#e2e8f0'; }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '1rem' }}>{formatVerseReferenceForDisplay(v.reference, version)}</span>
                            {isSelected && <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>}
                          </div>
                          {v.title && <span style={{ fontSize: '0.85rem', color: '#475569' }}>{v.title}</span>}
                          {v.text && <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.text}</span>}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', width: '100%', maxWidth: '400px' }}>
            {(!multiplayerState?.host || multiplayerState.host === myClientId) ? (
              <>
                <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>{t("等待玩家...", "Waiting...")}</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getRoomColor(multiplayerRoomId) || '#3b82f6', letterSpacing: '6px', marginBottom: '0.8rem', background: (getRoomColor(multiplayerRoomId) || '#3b82f6') + '18', borderRadius: '8px', padding: '0.4rem 1.2rem', display: 'inline-block', border: `3px solid ${getRoomColor(multiplayerRoomId) || '#3b82f6'}`, boxShadow: `0 0 16px ${getRoomColor(multiplayerRoomId) || '#3b82f6'}44` }}>{multiplayerRoomId}</div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{t("請朋友輸入上方的代碼來加入您的遊戲", "Ask your friend to enter this code to join")}</p>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <QRCodeSVG value={buildPublicShareUrl(window.location.pathname, { room: multiplayerRoomId, ref: personalCode })} size={120} />
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{t("或掃描上方 QR Code 快速加入", "or scan QR to join")}</p>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 1rem 0', color: '#3b82f6' }}>{multiplayerState?.status === 'playing' ? t("比賽進行中", "Match in progress") : t("等待遊戲開始...", "Waiting for game...")}</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getRoomColor(multiplayerRoomId) || '#3b82f6', letterSpacing: '6px', marginBottom: '0.8rem', background: (getRoomColor(multiplayerRoomId) || '#3b82f6') + '18', borderRadius: '8px', padding: '0.4rem 1.2rem', display: 'inline-block', border: `3px solid ${getRoomColor(multiplayerRoomId) || '#3b82f6'}`, boxShadow: `0 0 16px ${getRoomColor(multiplayerRoomId) || '#3b82f6'}44` }}>{multiplayerRoomId}</div>
                <p style={{ color: '#0ea5e9', fontSize: '1.05rem', margin: '1rem 0 0 0', fontWeight: 'bold', lineHeight: 1.5 }}>
                  {multiplayerState?.status === 'playing'
                    ? t("請先選擇隊伍，", "Choose a team first,")
                    : t("現在等候遊戲主人選好經文，", "Waiting for the host to")} <br /> {multiplayerState?.status === 'playing' ? t("就可以加入這場比賽。", "then you can join this match.") : t("請稍後。。。", "select verses, please wait...")}
                </p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button variant="secondary" size="lg" onClick={() => {
                if (socketRef.current) socketRef.current.close();
                setMultiplayerRoomMode(null);
                setMultiplayerRoomRole('player');
                setMultiplayerRoomId(null);
                setMultiplayerState(null);
              }}>
              {t("離開房間", "Leave Room")}
            </Button>

            {multiplayerState?.host === myClientId && (
              <button
                onClick={() => {
                  setShowMultiplayerVersePicker(true);
                  setPickerLockedSet(false);
                  setPickerSelectedSet(null);
                  setMultiplayerSearchText('');
                  setShowPickerBrowser(false);
                }}
                disabled={!multiplayerState || (multiplayerState.matchType !== 'team' && Object.keys(multiplayerState.players).length < 2)}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: !multiplayerState || (multiplayerState.matchType !== 'team' && Object.keys(multiplayerState?.players || {}).length < 2) ? 'not-allowed' : 'pointer', opacity: !multiplayerState || (multiplayerState.matchType !== 'team' && Object.keys(multiplayerState?.players || {}).length < 2) ? 0.5 : 1 }}
              >
                {t("選擇比賽經文", "Select Verse")}
              </button>
            )}
          </div>

          {multiplayerState && multiplayerState.players && (
            <div style={{ width: '100%', maxWidth: '520px', textAlign: 'left', marginTop: '1rem' }}>
              {multiplayerState.matchType === 'team' && multiplayerState.host !== myClientId && (
                <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155' }}>{t("選擇你的隊伍", "Choose Your Team")}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                    {(multiplayerState.teams || TEAM_OPTIONS).map(team => {
                      const selected = multiplayerState.players[myClientId]?.teamId === team.id;
                      const locked = Boolean(multiplayerState.players[myClientId]?.teamId);
                      const members = Object.values(multiplayerState.players || {}).filter(p => p.connected && p.teamId === team.id);
                      return (
                        <button
                          key={team.id}
                          onClick={() => {
                            if (!locked && socketRef.current) socketRef.current.send(JSON.stringify({ type: 'SELECT_TEAM', teamId: team.id }));
                          }}
                          disabled={locked}
                          style={{ border: `2px solid ${selected ? team.color : '#e2e8f0'}`, background: selected ? `${team.color}18` : 'white', borderRadius: '10px', padding: '0.9rem', cursor: locked ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', opacity: locked && !selected ? 0.55 : 1 }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />
                            <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>{t(team.name, team.enName || team.name)}</span>
                          </span>
                          <span style={{ color: selected ? team.color : '#64748b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{selected ? t("已選", "Picked") : `${members.length}`}</span>
                        </button>
                      );
                    })}
                  </div>
                  {multiplayerState.players[myClientId]?.teamId && (
                    <p style={{ margin: '0.75rem 0 0 0', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>{multiplayerState.status === 'playing' ? t("隊伍已鎖定，正在加入比賽。", "Team locked. Joining the match.") : t("隊伍已鎖定，等老師選經文。", "Team locked. Wait for the teacher to choose verses.")}</p>
                  )}
                </div>
              )}
              {multiplayerState.matchType === 'team' && multiplayerState.host === myClientId ? (
                <>
                  <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>{t("隊伍狀態:", "Team Status:")}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                    {(multiplayerState.teams || TEAM_OPTIONS).map(team => {
                      const members = Object.values(multiplayerState.players || {}).filter(p => p.connected && p.teamId === team.id);
                      return (
                        <div key={team.id} style={{ background: `${team.color}12`, border: `1px solid ${team.color}55`, borderRadius: '10px', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />{t(team.name, team.enName || team.name)}</strong>
                            <span style={{ color: team.color, fontWeight: 'bold' }}>{members.length}</span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.85rem', minHeight: '1.2rem' }}>
                            {members.length > 0 ? members.map(p => p.name).join('、') : t("等待加入", "Waiting")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>{t("已加入的玩家:", "Players Joined:")}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.values(multiplayerState.players).map(p => {
                      const team = getTeamById(p.teamId, multiplayerState.teams);
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: team?.color || p.color, boxShadow: '0 0 0 2px white, 0 0 0 4px ' + (team?.color || p.color) }}></div>
                          <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{p.name} {multiplayerState.host === p.id ? '(Host)' : ''}</span>
                          {team && <span style={{ color: team.color, background: `${team.color}16`, border: `1px solid ${team.color}55`, borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{t(team.name, team.enName || team.name)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
