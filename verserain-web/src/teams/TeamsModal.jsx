import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Crown, Copy, RefreshCw, LogOut, ChevronLeft, Plus, Heart, QrCode, HelpCircle, BookOpen } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { teamsApi, CHEER_EMOJIS } from './teamsApi';
import { HELP_CONTENT, resolveHelpLang } from './helpContent';
import SetPicker from './SetPicker';

// Public origin used to build join deep-links (?join=<CODE>). Hard-coded
// here rather than window.location.origin because a code shared from a
// localhost dev session must still point at the production site.
const PUBLIC_ORIGIN = 'https://www.verserain.com';
const buildJoinUrl = (code) => `${PUBLIC_ORIGIN}/?join=${encodeURIComponent(code)}`;

// Single self-contained modal for the Teams feature. Mounted from App.jsx
// with { userEmail, playerName, t, onClose }. Maintains its own internal
// "view" state (list | detail | admin) and never touches App.jsx render tree.

const colors = {
  bg: '#0f172a',
  card: '#1e293b',
  cardSoft: '#334155',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  accent: '#3b82f6',
  warm: '#f59e0b',
};

const btn = (kind = 'primary') => ({
  background:
    kind === 'primary' ? colors.accent : kind === 'warm' ? colors.warm : 'transparent',
  color: kind === 'ghost' ? colors.text : 'white',
  border: kind === 'ghost' ? `1px solid ${colors.border}` : 'none',
  padding: '0.55rem 1rem',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

const card = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: '1rem',
};

const input = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  color: colors.text,
  borderRadius: 8,
  padding: '0.55rem 0.75rem',
  fontSize: '0.95rem',
  width: '100%',
  boxSizing: 'border-box',
};

export default function TeamsModal({
  userEmail, playerName, t, uiLang = 'en', onClose,
  pendingJoinCode, onJoinHandled,
  topicSets = [],            // bundled verse sets, for SetPicker
  onLaunchSet,               // (setId) => void — closes modal + starts campaign in App.jsx
}) {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'admin'
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const openTeam = (id) => {
    setActiveTeamId(id);
    setView('detail');
  };

  if (!userEmail) {
    return (
      <Backdrop onClose={onClose}>
        <div style={{ ...card, maxWidth: 420, textAlign: 'center' }}>
          <h2 style={{ color: colors.text, marginTop: 0 }}>{t('團隊', 'Teams')}</h2>
          <p style={{ color: colors.muted }}>
            {t('請先登入或申請帳號才能加入團隊。', 'Please sign in to use teams.')}
          </p>
          <button onClick={onClose} style={btn('primary')}>{t('關閉', 'Close')}</button>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop onClose={onClose}>
      <div style={{ ...card, width: 'min(720px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 0 }}>
        <Header
          title={
            view === 'list' ? t('我的團隊', 'My Teams') :
            view === 'admin' ? t('團隊管理', 'Team Admin') :
            t('團隊', 'Team')
          }
          showBack={view !== 'list'}
          onBack={() => setView('list')}
          onClose={onClose}
          onHelp={() => setShowHelp(true)}
        />
        {showHelp && <HelpModal uiLang={uiLang} onClose={() => setShowHelp(false)} />}
        <div style={{ padding: '1rem' }}>
          {view === 'list' && (
            <TeamsListView
              userEmail={userEmail}
              t={t}
              onOpen={openTeam}
              pendingJoinCode={pendingJoinCode}
              onJoinHandled={onJoinHandled}
            />
          )}
          {view === 'detail' && activeTeamId && (
            <TeamDetailView
              key={activeTeamId}
              userEmail={userEmail}
              playerName={playerName}
              teamId={activeTeamId}
              t={t}
              onOpenAdmin={() => setView('admin')}
              onLeft={() => setView('list')}
              onLaunchSet={onLaunchSet}
            />
          )}
          {view === 'admin' && activeTeamId && (
            <TeamAdminView
              key={activeTeamId}
              userEmail={userEmail}
              teamId={activeTeamId}
              t={t}
              topicSets={topicSets}
              onBack={() => setView('detail')}
              onDisbanded={() => setView('list')}
            />
          )}
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Header({ title, showBack, onBack, onClose, onHelp }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem', borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showBack && (
          <button onClick={onBack} style={{ ...btn('ghost'), padding: '0.3rem 0.5rem' }}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h2 style={{ color: colors.text, margin: 0, fontSize: '1.1rem' }}>
          <Users size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {onHelp && (
          <button
            onClick={onHelp}
            style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4, display: 'flex' }}
            title="Help"
          >
            <HelpCircle size={20} />
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={22} />
        </button>
      </div>
    </div>
  );
}

function HelpModal({ uiLang, onClose }) {
  const lang = resolveHelpLang(uiLang);
  const c = HELP_CONTENT[lang];
  // Convert simple inline-markdown (**bold**) to spans, preserve \n line breaks.
  const renderBody = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      return (
        <div key={i} style={{ marginBottom: line.trim() ? 6 : 0 }}>
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} style={{ color: colors.text }}>{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          )}
        </div>
      );
    });
  };

  return (
    <Backdrop onClose={onClose}>
      <div
        style={{
          ...card,
          width: 'min(640px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 0,
        }}
      >
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${colors.border}`,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(14,165,233,0.08))',
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ color: colors.text, margin: 0, fontSize: '1.2rem' }}>{c.title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={22} />
            </button>
          </div>
          <div style={{ color: colors.muted, fontSize: '0.9rem', marginTop: 4 }}>{c.intro}</div>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          {c.sections.map((s, idx) => (
            <div key={idx} style={{ marginBottom: 18 }}>
              <h3 style={{ color: colors.text, fontSize: '1rem', margin: '0 0 8px 0' }}>{s.title}</h3>
              <div style={{ color: colors.text, fontSize: '0.88rem', lineHeight: 1.6 }}>
                {renderBody(s.body)}
              </div>
            </div>
          ))}
          <div style={{ color: colors.muted, fontSize: '0.75rem', borderTop: `1px solid ${colors.border}`, paddingTop: 10, marginTop: 12 }}>
            {c.detailLink}
          </div>
        </div>
        <div style={{ padding: '0.75rem 1.25rem', borderTop: `1px solid ${colors.border}`, textAlign: 'right' }}>
          <button onClick={onClose} style={btn('primary')}>{c.closeBtn}</button>
        </div>
      </div>
    </Backdrop>
  );
}

// -------------------- List view --------------------

function TeamsListView({ userEmail, t, onOpen, pendingJoinCode, onJoinHandled }) {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(!!pendingJoinCode);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const data = await teamsApi.myTeams(userEmail);
      setTeams(data.teams || []);
    } catch (e) {
      setError(String(e.message || e));
      setTeams([]);
    }
  }, [userEmail]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setShowCreate(true)} style={btn('primary')}>
          <Plus size={16} /> {t('建立團隊', 'Create team')}
        </button>
        <button onClick={() => setShowJoin(true)} style={btn('ghost')}>
          {t('用邀請碼加入', 'Join with code')}
        </button>
      </div>

      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}

      {teams == null && <p style={{ color: colors.muted }}>{t('載入中…', 'Loading…')}</p>}

      {teams && teams.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: colors.muted }}>
          <p style={{ marginTop: 0 }}>{t('你還沒有加入任何團隊。', "You haven't joined any team yet.")}</p>
          <p style={{ marginBottom: 0, fontSize: '0.9rem' }}>
            {t('團隊不是比賽,而是陪伴。', 'Teams are for companionship, not competition.')}
          </p>
        </div>
      )}

      {teams && teams.map(team => (
        <div
          key={team.id}
          onClick={() => onOpen(team.id)}
          style={{ ...card, marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: colors.text, fontSize: '1.05rem' }}>{team.name}</strong>
              {team.isAdmin && (
                <span style={{
                  background: colors.warm, color: 'white', fontSize: '0.7rem',
                  padding: '0.1rem 0.5rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <Crown size={10} /> {t('管理員', 'Admin')}
                </span>
              )}
            </div>
            {team.description && (
              <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: 4 }}>{team.description}</div>
            )}
            <div style={{ color: colors.muted, fontSize: '0.8rem', marginTop: 4 }}>
              {team.memberCount} {t('位團員', 'members')}
            </div>
          </div>
          <ChevronLeft size={18} style={{ color: colors.muted, transform: 'rotate(180deg)' }} />
        </div>
      ))}

      {showCreate && (
        <CreateTeamForm
          t={t}
          onCancel={() => setShowCreate(false)}
          onCreated={(teamId) => { setShowCreate(false); refresh().then(() => onOpen(teamId)); }}
          userEmail={userEmail}
        />
      )}
      {showJoin && (
        <JoinTeamForm
          t={t}
          onCancel={() => { setShowJoin(false); if (pendingJoinCode) onJoinHandled?.(); }}
          onJoined={(teamId) => { setShowJoin(false); onJoinHandled?.(); refresh().then(() => onOpen(teamId)); }}
          userEmail={userEmail}
          initialCode={pendingJoinCode || ''}
        />
      )}
    </div>
  );
}

function CreateTeamForm({ t, onCancel, onCreated, userEmail }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const r = await teamsApi.create(userEmail, name.trim(), desc.trim());
      onCreated(r.team.id);
    } catch (e) {
      setError(String(e.message || e));
      setBusy(false);
    }
  };

  return (
    <Backdrop onClose={onCancel}>
      <div style={{ ...card, width: 'min(420px, 100%)' }}>
        <h3 style={{ color: colors.text, marginTop: 0 }}>{t('建立團隊', 'Create team')}</h3>
        <label style={{ color: colors.muted, fontSize: '0.85rem' }}>{t('團隊名稱', 'Team name')}</label>
        <input value={name} onChange={e => setName(e.target.value)} style={input} maxLength={80} />
        <div style={{ height: 10 }} />
        <label style={{ color: colors.muted, fontSize: '0.85rem' }}>{t('簡介(選填)', 'Description (optional)')}</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} style={{ ...input, minHeight: 72, fontFamily: 'inherit' }} maxLength={500} />
        {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onCancel} style={btn('ghost')} disabled={busy}>{t('取消', 'Cancel')}</button>
          <button onClick={submit} style={btn('primary')} disabled={busy || !name.trim()}>
            {busy ? t('建立中…', 'Creating…') : t('建立', 'Create')}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// Normalize a user-typed invite code into the canonical XXX-YYYY shape.
// Users often type the 7 chars without the dash, or copy with stray
// whitespace, or paste in lowercase. Strip everything that isn't a letter
// or digit, uppercase, then re-insert the dash after position 3.
function normalizeInviteCode(raw) {
  const cleaned = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  // Allow longer pastes (defensive); only the first 7 alnum chars matter,
  // server still validates the lookup so a garbage tail just 404s cleanly.
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
}

function JoinTeamForm({ t, onCancel, onJoined, userEmail, initialCode = '' }) {
  const [code, setCode] = useState(normalizeInviteCode(initialCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const normalized = normalizeInviteCode(code);
    if (!normalized) return;
    setBusy(true);
    setError('');
    try {
      const r = await teamsApi.join(userEmail, normalized);
      onJoined(r.team.id);
    } catch (e) {
      setError(String(e.message || e));
      setBusy(false);
    }
  };

  return (
    <Backdrop onClose={onCancel}>
      <div style={{ ...card, width: 'min(360px, 100%)' }}>
        <h3 style={{ color: colors.text, marginTop: 0 }}>{t('用邀請碼加入', 'Join with invite code')}</h3>
        <input
          value={code}
          onChange={e => setCode(normalizeInviteCode(e.target.value))}
          style={{ ...input, letterSpacing: 2, textAlign: 'center', fontSize: '1.1rem', fontFamily: 'monospace' }}
          placeholder="XXX-XXXX"
          maxLength={20}
        />
        {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onCancel} style={btn('ghost')} disabled={busy}>{t('取消', 'Cancel')}</button>
          <button onClick={submit} style={btn('primary')} disabled={busy || !code.trim()}>
            {busy ? t('加入中…', 'Joining…') : t('加入', 'Join')}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// -------------------- Detail view --------------------

function TeamDetailView({ userEmail, playerName, teamId, t, onOpenAdmin, onLeft, onLaunchSet }) {
  const [team, setTeam] = useState(null);
  const [displayNames, setDisplayNames] = useState({});
  const [schedule, setSchedule] = useState({ items: [] });
  const [progress, setProgress] = useState({});
  const [cheers, setCheers] = useState([]);
  // All reflections in this team, fetched once and grouped by itemId so
  // each ScheduleItemCard renders without its own round-trip.
  const [reflections, setReflections] = useState([]);
  const [stats, setStats] = useState(null);
  // Verified set-level progress: { setStatus: {setId: {email: {status, passedCount, totalCount}}} }
  const [verifiedProgress, setVerifiedProgress] = useState({ setStatus: {} });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const meLc = String(userEmail || '').toLowerCase();
  const isAdmin = team && team.admins && team.admins.includes(meLc);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [tRes, sRes, pRes, cRes, rRes, stRes, vRes] = await Promise.all([
        teamsApi.get(userEmail, teamId),
        teamsApi.getSchedule(userEmail, teamId),
        teamsApi.getProgress(userEmail, teamId),
        teamsApi.getCheers(userEmail, teamId),
        teamsApi.listReflections(userEmail, teamId).catch(() => ({ reflections: [], displayNames: {} })),
        teamsApi.getStats(userEmail, teamId).catch(() => null),
        teamsApi.getTeamSetProgress(userEmail, teamId).catch(() => ({ setStatus: {} })),
      ]);
      setTeam(tRes.team);
      setDisplayNames({ ...(tRes.displayNames || {}), ...(rRes.displayNames || {}) });
      setSchedule(sRes.schedule || { items: [] });
      setProgress(pRes.progress || {});
      setCheers(cRes.cheers || []);
      setReflections(rRes.reflections || []);
      setStats(stRes || null);
      setVerifiedProgress(vRes || { setStatus: {} });
    } catch (e) {
      setError(String(e.message || e));
    }
  }, [userEmail, teamId]);

  useEffect(() => { refresh(); }, [refresh]);

  const sendCheer = async (targetEmail, emoji, text = '') => {
    try {
      await teamsApi.cheer(userEmail, teamId, targetEmail, emoji, text);
      // Refresh inbox so sender sees their cheer in the team feed; cheap
      // since we already poll the same endpoint elsewhere.
      teamsApi.getCheers(userEmail, teamId).then(c => setCheers(c.cheers || [])).catch(() => {});
    } catch (e) { /* swallow; cheers are not critical */ }
  };

  const leave = async () => {
    if (!window.confirm(t('確定要離開這個團隊嗎?(進度記錄會保留)', 'Leave this team? Your progress is kept.'))) return;
    setBusy(true);
    try {
      await teamsApi.leave(userEmail, teamId);
      onLeft();
    } catch (e) {
      setError(String(e.message || e));
      setBusy(false);
    }
  };

  if (error && !team) return <p style={{ color: '#fca5a5' }}>{error}</p>;
  if (!team) return <p style={{ color: colors.muted }}>{t('載入中…', 'Loading…')}</p>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: colors.text, margin: 0 }}>{team.name}</h2>
        {team.description && <p style={{ color: colors.muted, marginTop: 4 }}>{team.description}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {isAdmin && (
            <button onClick={onOpenAdmin} style={btn('warm')}>
              <Crown size={14} /> {t('管理', 'Manage')}
            </button>
          )}
          <button onClick={leave} style={btn('ghost')} disabled={busy}>
            <LogOut size={14} /> {t('離開團隊', 'Leave')}
          </button>
        </div>
      </div>

      {stats && <TeamFruitsPanel stats={stats} t={t} />}

      {isAdmin && (
        <CarePrompt
          team={team}
          setStatusByItem={verifiedProgress.setStatus || {}}
          schedule={schedule}
          displayNames={displayNames}
          meLc={meLc}
          onCheer={sendCheer}
          t={t}
        />
      )}

      {cheers.length > 0 && (
        <div style={{ ...card, marginBottom: 12, background: colors.cardSoft }}>
          <div style={{ color: colors.text, fontSize: '0.9rem', marginBottom: 8 }}>
            {t('最近的鼓勵', 'Recent encouragement')} ({cheers.length})
          </div>
          {/* Emoji-only cheers as inline reaction row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: cheers.some(c => c.text) ? 10 : 0 }}>
            {cheers.filter(c => !c.text).slice(0, 12).map((c, i) => (
              <span key={i} style={{ fontSize: '1.1rem' }} title={`${displayNames[c.from] || c.from} · ${c.at}`}>
                {c.emoji}
              </span>
            ))}
          </div>
          {/* Cheers with text — render as small quote cards */}
          {cheers.filter(c => c.text).slice(0, 5).map((c, i) => (
            <div key={`t${i}`} style={{
              background: colors.bg, borderRadius: 8, padding: '0.5rem 0.7rem',
              marginTop: 6, display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{c.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: colors.text, fontSize: '0.9rem', wordBreak: 'break-word' }}>{c.text}</div>
                <div style={{ color: colors.muted, fontSize: '0.75rem', marginTop: 2 }}>
                  — {displayNames[c.from] || c.from.split('@')[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ color: colors.text, fontSize: '1rem', marginBottom: 8 }}>
        {t('讀經進度表', 'Reading schedule')}
      </h3>
      {schedule.items.length === 0 ? (
        <div style={{ ...card, color: colors.muted, marginBottom: 16 }}>
          {t('管理員還沒有設立進度表。', "The admin hasn't set up a schedule yet.")}
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {schedule.items.map(item => (
            <ScheduleItemCard
              key={item.id}
              item={item}
              userEmail={userEmail}
              teamId={teamId}
              t={t}
              setStatus={verifiedProgress.setStatus?.[item.setId] || {}}
              memberEmails={team.members || []}
              onLaunchSet={onLaunchSet}
              reflections={reflections.filter(r => r.itemId === item.id)}
              displayNames={displayNames}
              meLc={meLc}
              isAdmin={isAdmin}
              onReflectionsChanged={refresh}
            />
          ))}
        </div>
      )}

      <h3 style={{ color: colors.text, fontSize: '1rem', marginBottom: 8 }}>
        {t('團員', 'Members')} ({team.members.length})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {team.members.map(memberEmail => (
          <MemberCard
            key={memberEmail}
            memberEmail={memberEmail}
            isMe={memberEmail === meLc}
            isAdmin={team.admins.includes(memberEmail)}
            displayName={displayNames[memberEmail] || memberEmail.split('@')[0]}
            schedule={schedule}
            setStatusByItem={verifiedProgress.setStatus || {}}
            onCheer={(emoji, text) => sendCheer(memberEmail, emoji, text)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

// Team-wide fruits panel. Three signals, none of them comparative:
//   - 你這週(personal milestone)
//   - 你的總果實(personal accumulation)
//   - 本團這週(collective celebration) + N/M 位有活動(participation, not ranking)
// Deliberately omits per-member breakdowns — points exist to reward growth,
// not produce a leaderboard.
function TeamFruitsPanel({ stats, t }) {
  const { weekTotal = 0, myWeek = 0, myTotal = 0, activeMembers = 0, memberCount = 0 } = stats;
  // Stat cell — small, soft, no progress bars (which read as race tracks).
  const Cell = ({ label, value, hint }) => (
    <div style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', padding: '0.4rem 0.3rem' }}>
      <div style={{ color: colors.muted, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ color: colors.text, fontSize: '1.25rem', fontWeight: 700, marginTop: 2 }}>
        {value}<span style={{ fontSize: '0.7rem', color: colors.muted, fontWeight: 400, marginLeft: 2 }}>🍎</span>
      </div>
      {hint && <div style={{ color: colors.muted, fontSize: '0.7rem', marginTop: 2 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{
      ...card,
      marginBottom: 12,
      background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(14,165,233,0.08))',
      borderColor: 'rgba(16,185,129,0.3)',
    }}>
      <div style={{ color: colors.text, fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>
        🌳 {t('本團果園', "Our team's fruit garden")}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <Cell label={t('你這週', 'You · this week')} value={myWeek} />
        <div style={{ width: 1, background: colors.border, alignSelf: 'stretch' }} />
        <Cell label={t('你共有', 'You · total')} value={myTotal} />
        <div style={{ width: 1, background: colors.border, alignSelf: 'stretch' }} />
        <Cell
          label={t('本團這週', 'Team · this week')}
          value={weekTotal}
          hint={t(`${activeMembers}/${memberCount} 位團員有活動`, `${activeMembers}/${memberCount} active`)}
        />
      </div>
    </div>
  );
}

// Admin-only "needs care" prompt. Pure derivation from progress + members:
// counts members who haven't opened any scheduled set, plus members whose
// last activity is more than 7 days ago. Expands to show names so the
// admin can send a personal cheer right there.
function CarePrompt({ team, setStatusByItem, schedule, displayNames, meLc, onCheer, t }) {
  const [expanded, setExpanded] = useState(false);

  const others = (team.members || []).filter(m => m !== meLc);
  const scheduledSetIds = (schedule.items || []).map(it => it.setId).filter(Boolean);
  const STALE_DAYS = 7;
  const now = Date.now();

  // Source of truth is now the verified setStatus from VerseRain campaigns.
  // "Not started" = every scheduled set status is 'not-started' (or absent).
  // "Stale" = at least one set was attempted but its last play date is > 7d ago.
  const notStarted = [];
  const stale = [];
  for (const m of others) {
    let touched = false;
    let mostRecent = 0;
    for (const sid of scheduledSetIds) {
      const s = setStatusByItem[sid]?.[m];
      if (!s || s.status === 'not-started') continue;
      touched = true;
      const d = Date.parse(s.date || '');
      if (Number.isFinite(d) && d > mostRecent) mostRecent = d;
    }
    if (!touched) {
      notStarted.push(m);
    } else if (mostRecent && now - mostRecent > STALE_DAYS * 86400_000) {
      stale.push(m);
    }
  }

  if (scheduledSetIds.length === 0) return null;
  if (notStarted.length === 0 && stale.length === 0) return null;

  const renderRow = (email) => (
    <div key={email} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.4rem 0', borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ color: colors.text }}>{displayNames[email] || email.split('@')[0]}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {CHEER_EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => onCheer(email, e)}
            style={{
              background: 'transparent', border: `1px solid ${colors.border}`,
              borderRadius: 6, cursor: 'pointer', padding: '0.15rem 0.35rem', fontSize: '0.95rem',
            }}
            title={t('送鼓勵', 'Send encouragement')}
          >{e}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      ...card,
      marginBottom: 12,
      background: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
    }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ color: colors.warm, fontSize: '0.9rem', fontWeight: 600 }}>
          {t('關心提示', 'Gentle nudge')} · {t('僅你看見', 'visible to admins only')}
        </div>
        <span style={{ color: colors.muted, fontSize: '0.85rem' }}>{expanded ? '▾' : '▸'}</span>
      </div>
      <div style={{ color: colors.text, fontSize: '0.9rem', marginTop: 6 }}>
        {notStarted.length > 0 && (
          <div>
            · {notStarted.length} {t('位團員還沒打開過進度表', 'members haven’t opened the schedule yet')}
          </div>
        )}
        {stale.length > 0 && (
          <div>
            · {stale.length} {t(`位團員 ${STALE_DAYS} 天沒有新進度`, `members have been quiet for ${STALE_DAYS}+ days`)}
          </div>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          {notStarted.length > 0 && (
            <>
              <div style={{ color: colors.muted, fontSize: '0.8rem', marginTop: 6 }}>{t('還沒開始', 'Not started')}</div>
              {notStarted.map(renderRow)}
            </>
          )}
          {stale.length > 0 && (
            <>
              <div style={{ color: colors.muted, fontSize: '0.8rem', marginTop: 6 }}>{t('安靜中', 'Quiet')}</div>
              {stale.map(renderRow)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Three-tier visual: 未開始 / 嘗試中 / 完成. Only `passed` earns set-pass
// points; the other two states are signals for the wall and care prompt.
function StatusBadge({ status, passedCount, totalCount, t }) {
  if (status === 'passed') {
    return (
      <span style={{
        background: '#16a34a', color: 'white', fontSize: '0.78rem',
        padding: '0.2rem 0.55rem', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}>✓ {t('完成', 'Done')}</span>
    );
  }
  if (status === 'attempting') {
    return (
      <span style={{
        background: '#f59e0b', color: 'white', fontSize: '0.78rem',
        padding: '0.2rem 0.55rem', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}>{passedCount}/{totalCount || '?'} · {t('嘗試中', 'Attempting')}</span>
    );
  }
  return (
    <span style={{
      background: 'transparent', color: colors.muted, fontSize: '0.78rem',
      padding: '0.2rem 0.55rem', borderRadius: 12, border: `1px solid ${colors.border}`,
      whiteSpace: 'nowrap',
    }}>{t('未開始', 'Not started')}</span>
  );
}

function ScheduleItemCard({
  item, userEmail, teamId, t,
  setStatus = {},          // per-email status for this item's setId
  memberEmails = [],       // all team members, for team-wide tally
  onLaunchSet,             // (setId) => launches campaign in App.jsx
  reflections = [], displayNames = {}, meLc = '', isAdmin = false, onReflectionsChanged,
}) {
  // The description can be lengthy; collapse to ~3 lines unless expanded.
  const [descExpanded, setDescExpanded] = useState(false);
  const [reflectExpanded, setReflectExpanded] = useState(false);
  const [composeType, setComposeType] = useState(null); // 'reflection' | 'prayer' | null
  const description = item.description || '';
  const descNeedsClamp = description.length > 140;

  const reflectionCount = reflections.filter(r => r.type === 'reflection').length;
  const prayerCount = reflections.filter(r => r.type === 'prayer').length;

  // My verified status from VerseRain campaign scores.
  const my = setStatus[meLc] || { status: 'not-started', passedCount: 0, totalCount: 0 };
  // Snapshot total from when admin picked the set; fall back to whatever we
  // saw in scoreboard. Display "?" if neither known yet.
  const totalCount = item.totalCount || my.totalCount || 0;

  // Team-wide tally for the "本組" mini summary line.
  let teamPassed = 0;
  let teamAttempting = 0;
  for (const e of memberEmails) {
    const s = setStatus[e]?.status;
    if (s === 'passed') teamPassed++;
    else if (s === 'attempting') teamAttempting++;
  }

  const isMissingSet = !item.setId;

  return (
    <div style={{ ...card, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ color: colors.text }}>{item.title || item.setId || t('未指定經文組', 'No set picked')}</strong>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {totalCount > 0 && (
              <span style={{ color: colors.muted, fontSize: '0.78rem' }}>
                {totalCount} {t('節', 'verses')}
              </span>
            )}
            {item.targetDate && (
              <span style={{ color: colors.muted, fontSize: '0.78rem' }}>
                · {t('目標', 'Target')}: {item.targetDate}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={my.status} passedCount={my.passedCount} totalCount={totalCount} t={t} />
      </div>

      {isMissingSet && (
        <div style={{
          marginTop: 8, padding: '0.5rem 0.7rem', borderRadius: 6,
          background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', fontSize: '0.82rem',
        }}>
          {t('此項目尚未連結到經文組,請管理員到「管理」頁選擇。', 'No verse set linked yet — admin should pick one in Manage.')}
        </div>
      )}

      {description && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            color: colors.text, fontSize: '0.88rem', lineHeight: 1.55,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: descExpanded || !descNeedsClamp ? 'none' : '4.5em',
            overflow: descExpanded || !descNeedsClamp ? 'visible' : 'hidden',
            position: 'relative',
          }}>
            {description}
          </div>
          {descNeedsClamp && (
            <button
              onClick={() => setDescExpanded(v => !v)}
              style={{
                background: 'transparent', border: 'none', color: colors.accent,
                cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0',
              }}
            >
              {descExpanded ? t('收起', 'Show less') : t('展開', 'Show more')}
            </button>
          )}
        </div>
      )}

      {/* Launch + team tally row */}
      {!isMissingSet && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          marginTop: 10, padding: '0.5rem 0.7rem', borderRadius: 6,
          background: colors.bg,
        }}>
          <button
            onClick={() => onLaunchSet?.(item.setId)}
            disabled={!onLaunchSet}
            style={{
              ...btn(my.status === 'passed' ? 'ghost' : 'primary'),
              padding: '0.35rem 0.8rem', fontSize: '0.85rem',
            }}
          >
            ▶ {my.status === 'passed'
                ? t('再次挑戰', 'Play again')
                : my.status === 'attempting'
                  ? t('繼續挑戰', 'Continue')
                  : t('開始挑戰', 'Start challenge')}
          </button>
          <div style={{ color: colors.muted, fontSize: '0.78rem', marginLeft: 'auto' }}>
            {t(`團隊:${teamPassed} 通過 · ${teamAttempting} 嘗試中`, `Team: ${teamPassed} passed · ${teamAttempting} attempting`)}
          </div>
        </div>
      )}

      {/* Reflections / Prayer requests — companionship core */}
      <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 10 }}>
        <div
          onClick={() => setReflectExpanded(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ color: colors.text, fontSize: '0.9rem' }}>
            <span style={{ color: colors.muted }}>{reflectExpanded ? '▾' : '▸'} </span>
            {reflectionCount > 0 || prayerCount > 0
              ? t(`心得 ${reflectionCount} · 代禱 ${prayerCount}`, `${reflectionCount} reflections · ${prayerCount} prayers`)
              : t('心得 · 代禱', 'Reflections · Prayers')}
          </div>
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setReflectExpanded(true); setComposeType('reflection'); }}
              style={{ ...btn('ghost'), padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
            >
              + {t('心得', 'Reflection')}
            </button>
            <button
              onClick={() => { setReflectExpanded(true); setComposeType('prayer'); }}
              style={{ ...btn('ghost'), padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
            >
              + {t('代禱', 'Prayer')}
            </button>
          </div>
        </div>

        {reflectExpanded && (
          <div style={{ marginTop: 10 }}>
            {reflections.length === 0 && (
              <div style={{ color: colors.muted, fontSize: '0.85rem', padding: '0.5rem 0' }}>
                {t('還沒有人分享。你想做第一個嗎?', 'No one has shared yet. Would you like to be the first?')}
              </div>
            )}
            {reflections.map(r => (
              <ReflectionRow
                key={r.id}
                reflection={r}
                userEmail={userEmail}
                meLc={meLc}
                isAdmin={isAdmin}
                teamId={teamId}
                displayName={displayNames[r.author] || r.author.split('@')[0]}
                t={t}
                onChanged={onReflectionsChanged}
              />
            ))}
          </div>
        )}

        {composeType && (
          <ComposeReflection
            t={t}
            userEmail={userEmail}
            teamId={teamId}
            itemId={item.id}
            type={composeType}
            // Legacy schedule items still have an inline verses[] we can
            // surface in the verse-tag chips. New items rely on the linked
            // verse set instead; fetching those verses for tagging is a
            // future polish — empty array hides the chip row gracefully.
            verses={Array.isArray(item.verses) ? item.verses : []}
            onCancel={() => setComposeType(null)}
            onCreated={() => { setComposeType(null); onReflectionsChanged?.(); }}
          />
        )}
      </div>
    </div>
  );
}

function ReflectionRow({ reflection: r, userEmail, meLc, isAdmin, teamId, displayName, t, onChanged }) {
  const [busy, setBusy] = useState(false);
  const isAuthor = r.author === meLc;
  const reactions = r.reactions || [];

  // Group reactions by emoji so we show "🙏 ×3" instead of three pray hands.
  const grouped = reactions.reduce((acc, x) => {
    if (!acc[x.emoji]) acc[x.emoji] = { count: 0, mine: false };
    acc[x.emoji].count++;
    if (x.from === meLc) acc[x.emoji].mine = true;
    return acc;
  }, {});

  const toggleReaction = async (emoji) => {
    if (busy) return;
    setBusy(true);
    try {
      await teamsApi.reactReflection(userEmail, teamId, r.itemId, r.id, emoji);
      await onChanged?.();
    } catch (e) { /* ignore */ }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(t('刪除這篇分享?無法復原。', 'Delete this share? Cannot be undone.'))) return;
    setBusy(true);
    try {
      await teamsApi.deleteReflection(userEmail, teamId, r.itemId, r.id);
      await onChanged?.();
    } catch (e) { /* ignore */ }
    setBusy(false);
  };

  const isPrayer = r.type === 'prayer';
  const accent = isPrayer ? '#8b5cf6' : '#0ea5e9';
  const label = isPrayer ? t('代禱', 'Prayer') : t('心得', 'Reflection');
  // Format ISO date as YYYY-MM-DD for stable, locale-independent display.
  const dateStr = (r.at || '').slice(0, 10);

  return (
    <div style={{
      background: colors.bg, borderRadius: 8, padding: '0.7rem',
      marginBottom: 8, borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{
          background: accent, color: 'white', fontSize: '0.7rem',
          padding: '0.1rem 0.45rem', borderRadius: 4, fontWeight: 600,
        }}>{label}</span>
        <strong style={{ color: colors.text, fontSize: '0.9rem' }}>{displayName}</strong>
        {r.verseRef && (
          <span style={{ color: colors.muted, fontSize: '0.78rem' }}>· {r.verseRef}</span>
        )}
        <span style={{ color: colors.muted, fontSize: '0.78rem', marginLeft: 'auto' }}>{dateStr}</span>
      </div>
      <div style={{
        color: colors.text, fontSize: '0.9rem', lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{r.text}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {CHEER_EMOJIS.map(e => {
          const g = grouped[e];
          return (
            <button
              key={e}
              disabled={busy}
              onClick={() => toggleReaction(e)}
              style={{
                background: g?.mine ? colors.cardSoft : 'transparent',
                border: `1px solid ${g?.mine ? colors.accent : colors.border}`,
                borderRadius: 12, cursor: 'pointer',
                padding: '0.1rem 0.5rem', fontSize: '0.85rem',
                color: colors.text,
              }}
            >
              {e}{g ? ` ${g.count}` : ''}
            </button>
          );
        })}
        {(isAuthor || isAdmin) && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              background: 'transparent', border: 'none', color: colors.muted,
              cursor: 'pointer', fontSize: '0.75rem', marginLeft: 'auto',
            }}
            title={isAuthor ? t('刪除', 'Delete') : t('管理員刪除', 'Admin delete')}
          >
            {t('刪除', 'Delete')}
          </button>
        )}
      </div>
    </div>
  );
}

function ComposeReflection({ t, userEmail, teamId, itemId, type, verses, onCancel, onCreated }) {
  const [text, setText] = useState('');
  const [verseRef, setVerseRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError('');
    try {
      await teamsApi.createReflection(userEmail, teamId, itemId, type, body, verseRef);
      onCreated();
    } catch (e) {
      setError(String(e.message || e));
      setBusy(false);
    }
  };

  const isPrayer = type === 'prayer';
  const accent = isPrayer ? '#8b5cf6' : '#0ea5e9';
  const heading = isPrayer ? t('寫一個代禱', 'Write a prayer request') : t('寫一篇心得', 'Write a reflection');
  const placeholder = isPrayer
    ? t('想請大家為什麼禱告?', 'What would you like the team to pray for?')
    : t('這段經文裡神對你說了什麼?', 'What did God speak to you through this passage?');

  return (
    <Backdrop onClose={busy ? () => {} : onCancel}>
      <div style={{ ...card, width: 'min(520px, 100%)', borderLeft: `4px solid ${accent}` }}>
        <h3 style={{ color: colors.text, marginTop: 0 }}>{heading}</h3>
        {verses.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: colors.muted, fontSize: '0.8rem', marginBottom: 4 }}>
              {t('關於哪一節?(選填)', 'About which verse? (optional)')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <button
                onClick={() => setVerseRef('')}
                style={{
                  background: !verseRef ? colors.cardSoft : 'transparent',
                  border: `1px solid ${!verseRef ? colors.accent : colors.border}`,
                  color: colors.text, borderRadius: 6, padding: '0.15rem 0.5rem',
                  fontSize: '0.78rem', cursor: 'pointer',
                }}
              >{t('整段', 'Whole passage')}</button>
              {verses.map(v => (
                <button
                  key={v}
                  onClick={() => setVerseRef(v)}
                  style={{
                    background: verseRef === v ? colors.cardSoft : 'transparent',
                    border: `1px solid ${verseRef === v ? colors.accent : colors.border}`,
                    color: colors.text, borderRadius: 6, padding: '0.15rem 0.5rem',
                    fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >{v}</button>
              ))}
            </div>
          </div>
        )}
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, 1000))}
          placeholder={placeholder}
          style={{ ...input, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }}
          maxLength={1000}
          autoFocus
        />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
          <span style={{ color: colors.muted, fontSize: '0.75rem' }}>{text.length}/1000</span>
          {error && <span style={{ color: '#fca5a5', fontSize: '0.8rem', marginLeft: 12 }}>{error}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onCancel} disabled={busy} style={btn('ghost')}>{t('取消', 'Cancel')}</button>
            <button onClick={submit} disabled={busy || !text.trim()} style={btn('primary')}>
              {busy ? t('送出中…', 'Posting…') : t('分享給團員', 'Share with team')}
            </button>
          </div>
        </div>
        <div style={{ color: colors.muted, fontSize: '0.72rem', marginTop: 8 }}>
          {t('提醒:分享後所有團員都會看到,可以彼此回應 ❤️ 🙏 ✨ 🌧️。', 'Reminder: all members will see this and can respond with reactions.')}
        </div>
      </div>
    </Backdrop>
  );
}

function MemberCard({ memberEmail, isMe, isAdmin, displayName, schedule, setStatusByItem = {}, onCheer, t }) {
  // Set-level progress: how many of the scheduled sets has this member
  // PASSED (system-verified, not self-reported). Plus how many they've
  // started — both shown in the muted line below their name. No ranking.
  let passedSets = 0;
  let attemptingSets = 0;
  let totalSets = 0;
  for (const item of (schedule.items || [])) {
    if (!item.setId) continue;
    totalSets++;
    const s = setStatusByItem[item.setId]?.[memberEmail]?.status;
    if (s === 'passed') passedSets++;
    else if (s === 'attempting') attemptingSets++;
  }

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteEmoji, setNoteEmoji] = useState(CHEER_EMOJIS[1]); // default 🙏
  const [noteText, setNoteText] = useState('');
  const [sent, setSent] = useState(false);

  const sendNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    await onCheer(noteEmoji, text);
    setNoteText('');
    setNoteOpen(false);
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  };

  return (
    <div style={{ ...card, padding: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <strong style={{ color: colors.text, fontSize: '0.95rem' }}>
          {displayName}
          {isMe && <span style={{ color: colors.muted, fontWeight: 'normal' }}> ({t('你', 'you')})</span>}
        </strong>
        {isAdmin && <Crown size={12} style={{ color: colors.warm }} />}
      </div>
      <div style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: 8 }}>
        {totalSets === 0
          ? t('進度表還沒設好', 'No schedule yet')
          : passedSets === 0 && attemptingSets === 0
            ? t('還沒開始', 'Not started')
            : attemptingSets === 0
              ? t(`通過 ${passedSets}/${totalSets} 組`, `Passed ${passedSets}/${totalSets}`)
              : t(`通過 ${passedSets}/${totalSets} · 嘗試中 ${attemptingSets}`, `Passed ${passedSets}/${totalSets} · ${attemptingSets} attempting`)}
      </div>
      {!isMe && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {CHEER_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => onCheer(e)}
                style={{
                  background: 'transparent', border: `1px solid ${colors.border}`,
                  borderRadius: 6, cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '1rem',
                }}
                title={t('送鼓勵', 'Send encouragement')}
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => setNoteOpen(v => !v)}
              style={{
                background: 'transparent', border: `1px solid ${colors.border}`,
                borderRadius: 6, cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.8rem',
                color: colors.muted, marginLeft: 'auto',
              }}
              title={t('寫一句話', 'Write a note')}
            >
              {noteOpen ? '×' : t('留言', '✏')}
            </button>
          </div>
          {sent && (
            <div style={{ color: colors.muted, fontSize: '0.75rem', marginTop: 4 }}>
              {t('已送出 ✓', 'Sent ✓')}
            </div>
          )}
          {noteOpen && (
            <div style={{ marginTop: 8, background: colors.bg, padding: '0.5rem', borderRadius: 6 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value.slice(0, 140))}
                placeholder={t('寫一句鼓勵的話…', 'Say something kind…')}
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'transparent',
                  border: 'none', color: colors.text, fontSize: '0.85rem',
                  resize: 'vertical', minHeight: 50, fontFamily: 'inherit', outline: 'none',
                }}
                maxLength={140}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                {CHEER_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNoteEmoji(e)}
                    style={{
                      background: noteEmoji === e ? colors.cardSoft : 'transparent',
                      border: `1px solid ${noteEmoji === e ? colors.accent : colors.border}`,
                      borderRadius: 6, cursor: 'pointer', padding: '0.15rem 0.35rem', fontSize: '0.95rem',
                    }}
                  >{e}</button>
                ))}
                <span style={{ color: colors.muted, fontSize: '0.7rem', marginLeft: 'auto' }}>{noteText.length}/140</span>
                <button
                  onClick={sendNote}
                  disabled={!noteText.trim()}
                  style={{
                    ...btn('primary'),
                    padding: '0.25rem 0.6rem', fontSize: '0.8rem',
                    opacity: noteText.trim() ? 1 : 0.5,
                  }}
                >{t('送出', 'Send')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -------------------- Admin view --------------------

function TeamAdminView({ userEmail, teamId, t, topicSets = [], onBack, onDisbanded }) {
  const [team, setTeam] = useState(null);
  const [displayNames, setDisplayNames] = useState({});
  const [schedule, setSchedule] = useState({ items: [] });
  const [error, setError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [copied, setCopied] = useState('');
  const [showQR, setShowQR] = useState(false);
  // Open SetPicker for a specific schedule-item index. -1 means not open.
  const [pickingIdx, setPickingIdx] = useState(-1);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [tRes, sRes] = await Promise.all([
        teamsApi.get(userEmail, teamId),
        teamsApi.getSchedule(userEmail, teamId),
      ]);
      setTeam(tRes.team);
      setDisplayNames(tRes.displayNames || {});
      setSchedule(sRes.schedule || { items: [] });
    } catch (e) { setError(String(e.message || e)); }
  }, [userEmail, teamId]);

  useEffect(() => { refresh(); }, [refresh]);

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch (e) { /* ignore */ }
  };

  const regen = async () => {
    if (!window.confirm(t('重新產生邀請碼?舊碼會立刻失效。', 'Regenerate invite code? The old code becomes invalid immediately.'))) return;
    try {
      const r = await teamsApi.regenInvite(userEmail, teamId);
      setTeam({ ...team, inviteCode: r.inviteCode });
    } catch (e) { setError(String(e.message || e)); }
  };

  const promote = async (target) => {
    try { await teamsApi.promote(userEmail, teamId, target); await refresh(); }
    catch (e) { setError(String(e.message || e)); }
  };
  const demote = async (target) => {
    try { await teamsApi.demote(userEmail, teamId, target); await refresh(); }
    catch (e) { setError(String(e.message || e)); }
  };

  const addScheduleItem = () => {
    const id = 's_' + Math.random().toString(36).slice(2, 8);
    setSchedule({ ...schedule, items: [...schedule.items, { id, setId: '', title: '', verses: [], targetDate: '', description: '' }] });
  };
  const updateItem = (idx, patch) => {
    const items = schedule.items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    setSchedule({ ...schedule, items });
  };
  const removeItem = (idx) => {
    setSchedule({ ...schedule, items: schedule.items.filter((_, i) => i !== idx) });
  };
  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await teamsApi.saveSchedule(userEmail, teamId, schedule);
    } catch (e) { setError(String(e.message || e)); }
    setSavingSchedule(false);
  };

  const disband = async () => {
    if (!window.confirm(t('確定解散這個團隊?所有進度、鼓勵、邀請碼都會被清除,無法復原。', 'Disband this team? All progress, cheers, and invite codes will be permanently deleted.'))) return;
    try {
      await teamsApi.disband(userEmail, teamId);
      onDisbanded();
    } catch (e) { setError(String(e.message || e)); }
  };

  if (!team) return <p style={{ color: colors.muted }}>{t('載入中…', 'Loading…')}</p>;

  return (
    <div>
      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: 4 }}>{t('邀請碼', 'Invite code')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{
            fontSize: '1.3rem', color: colors.text, letterSpacing: 2, fontFamily: 'monospace',
            background: colors.bg, padding: '0.4rem 0.7rem', borderRadius: 8, flex: '1 1 160px', textAlign: 'center',
          }}>
            {team.inviteCode}
          </code>
          <button onClick={() => copyText(team.inviteCode, 'code')} style={btn('ghost')} title={t('複製碼', 'Copy code')}>
            <Copy size={14} /> {copied === 'code' ? t('已複製', 'Copied') : t('複製碼', 'Copy code')}
          </button>
          <button onClick={() => copyText(buildJoinUrl(team.inviteCode), 'link')} style={btn('ghost')} title={t('複製加入連結', 'Copy join link')}>
            <Copy size={14} /> {copied === 'link' ? t('已複製', 'Copied') : t('複製連結', 'Copy link')}
          </button>
          <button onClick={() => setShowQR(true)} style={btn('ghost')} title={t('顯示 QR Code', 'Show QR code')}>
            <QrCode size={14} /> QR
          </button>
          <button onClick={regen} style={btn('ghost')} title={t('重新產生', 'Regenerate')}>
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ color: colors.muted, fontSize: '0.75rem', marginTop: 6 }}>
          {t('連結:', 'Link:')} <span style={{ fontFamily: 'monospace', color: colors.text }}>{buildJoinUrl(team.inviteCode)}</span>
        </div>
      </div>

      {showQR && (
        <Backdrop onClose={() => setShowQR(false)}>
          <div style={{ ...card, width: 'min(360px, 100%)', textAlign: 'center', background: 'white' }}>
            <h3 style={{ color: '#0f172a', marginTop: 0 }}>{team.name}</h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: 0 }}>
              {t('掃描加入', 'Scan to join')}
            </p>
            <div style={{ background: 'white', padding: 12, display: 'inline-block', borderRadius: 8 }}>
              <QRCodeSVG value={buildJoinUrl(team.inviteCode)} size={220} level="M" />
            </div>
            <div style={{ marginTop: 12, fontFamily: 'monospace', letterSpacing: 2, fontSize: '1.1rem', color: '#0f172a' }}>
              {team.inviteCode}
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setShowQR(false)} style={btn('primary')}>{t('關閉', 'Close')}</button>
            </div>
          </div>
        </Backdrop>
      )}

      <div style={{ ...card, marginBottom: 12 }}>
        <h3 style={{ color: colors.text, fontSize: '1rem', marginTop: 0 }}>{t('讀經進度表', 'Reading schedule')}</h3>
        {schedule.items.length === 0 && (
          <p style={{ color: colors.muted, fontSize: '0.9rem' }}>
            {t('還沒有項目。下面新增第一個。', 'No items yet. Add the first one below.')}
          </p>
        )}
        {schedule.items.map((item, idx) => (
          <div key={item.id} style={{ background: colors.bg, padding: '0.6rem', borderRadius: 8, marginBottom: 8 }}>
            {/* Set picker row replaces free-text setId + verses inputs */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0.4rem 0.6rem', background: colors.card, borderRadius: 6,
              border: item.setId ? `1px solid ${colors.border}` : `1px dashed #f59e0b`,
            }}>
              <BookOpen size={14} style={{ color: item.setId ? colors.muted : '#f59e0b', flexShrink: 0 }} />
              {item.setId ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: colors.text, fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title || item.setId}
                  </div>
                  <div style={{ color: colors.muted, fontSize: '0.72rem' }}>
                    {item.setId} · {item.totalCount || (item.verses?.length) || '?'} {t('節', 'verses')}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, color: '#fbbf24', fontSize: '0.85rem' }}>
                  {t('還沒選經文組', 'No verse set picked')}
                </div>
              )}
              <button onClick={() => setPickingIdx(idx)} style={btn('ghost')}>
                {item.setId ? t('更換', 'Change') : t('選擇', 'Pick')}
              </button>
              <button onClick={() => removeItem(idx)} style={btn('ghost')}>{t('刪除', 'Remove')}</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <label style={{ color: colors.muted, fontSize: '0.78rem' }}>{t('目標日期', 'Target')}:</label>
              <input
                type="date"
                value={item.targetDate || ''}
                onChange={e => updateItem(idx, { targetDate: e.target.value })}
                style={{ ...input, width: 160, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
              />
            </div>
            <textarea
              placeholder={t('給團員的話(選填) — 為什麼選這段、怎麼默想…', 'Note to members (optional) — why this passage, how to reflect…')}
              value={item.description || ''}
              onChange={e => updateItem(idx, { description: e.target.value.slice(0, 800) })}
              style={{ ...input, marginTop: 6, minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }}
              maxLength={800}
            />
          </div>
        ))}

        {pickingIdx >= 0 && (
          <SetPicker
            topicSets={topicSets}
            t={t}
            onCancel={() => setPickingIdx(-1)}
            onPick={(picked) => {
              updateItem(pickingIdx, {
                setId: picked.setId,
                title: picked.title,
                totalCount: picked.totalCount,
                source: picked.source,
                // Drop legacy verses array; the canonical "what's in this
                // set" lives in the bundled/shared set definition.
                verses: undefined,
              });
              setPickingIdx(-1);
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={addScheduleItem} style={btn('ghost')}><Plus size={14} /> {t('新增項目', 'Add item')}</button>
          <button onClick={saveSchedule} style={btn('primary')} disabled={savingSchedule}>
            {savingSchedule ? t('儲存中…', 'Saving…') : t('儲存進度表', 'Save schedule')}
          </button>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <h3 style={{ color: colors.text, fontSize: '1rem', marginTop: 0 }}>{t('團員與權限', 'Members & roles')}</h3>
        {team.members.map(m => {
          const adminFlag = team.admins.includes(m);
          const isSelf = m === userEmail.toLowerCase();
          return (
            <div key={m} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.4rem 0', borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{ color: colors.text }}>
                {displayNames[m] || m.split('@')[0]}
                {adminFlag && <Crown size={12} style={{ color: colors.warm, marginLeft: 6, verticalAlign: 'middle' }} />}
                <span style={{ color: colors.muted, fontSize: '0.8rem', marginLeft: 6 }}>{m}</span>
              </div>
              <div>
                {adminFlag ? (
                  !isSelf && <button onClick={() => demote(m)} style={btn('ghost')}>{t('取消管理員', 'Demote')}</button>
                ) : (
                  <button onClick={() => promote(m)} style={btn('ghost')}>{t('設為管理員', 'Promote')}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...card, borderColor: '#7f1d1d' }}>
        <h3 style={{ color: '#fca5a5', fontSize: '1rem', marginTop: 0 }}>{t('危險區域', 'Danger zone')}</h3>
        <p style={{ color: colors.muted, fontSize: '0.85rem', marginTop: 0 }}>
          {t('解散團隊會永久清除所有進度與鼓勵記錄。', 'Disbanding deletes all progress and cheer history permanently.')}
        </p>
        <button onClick={disband} style={{ ...btn('ghost'), color: '#fca5a5', borderColor: '#7f1d1d' }}>
          {t('解散團隊', 'Disband team')}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onBack} style={btn('ghost')}><ChevronLeft size={14} /> {t('回團隊', 'Back to team')}</button>
      </div>
    </div>
  );
}
