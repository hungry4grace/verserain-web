// An author's verse sets — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { X } from 'lucide-react';

export default function AuthorSetsModal({ t, authorSetsModal, authorVerseSets, currentSet, playerName, setAuthorSetsModal, setMainTab, setSelectedSetId, setViewCounts, userEmail, viewCounts }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.52)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '760px', maxHeight: '88vh', overflow: 'hidden', position: 'relative', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)', border: '1px solid #dbeafe' }}>
        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#64748b', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.35rem' }}>{t("作者的經文組", "Author's Verse Sets")}</div>
            <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.35rem', lineHeight: 1.25, overflowWrap: 'anywhere' }}>
              {authorSetsModal.authorName === '匿名玩家' ? t('匿名玩家', 'Anonymous') : authorSetsModal.authorName === 'Verserain 官方' ? t('Verserain 官方', 'Official') : authorSetsModal.authorName}
            </h2>
          </div>
          <button
            onClick={() => setAuthorSetsModal(null)}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}
            title={t("關閉", "Close")}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '1rem 1.75rem 1.5rem', overflowY: 'auto', maxHeight: 'calc(88vh - 104px)' }}>
          {authorVerseSets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontWeight: 'bold' }}>{t("目前沒有經文組", "No verse sets found")}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {authorVerseSets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => {
                    setSelectedSetId(set.id);
                    setAuthorSetsModal(null);
                    setMainTab('versesets');
                    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id, adminEmail: userEmail, adminName: playerName }) }).catch(e => e);
                    setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                  }}
                  style={{ width: '100%', textAlign: 'left', background: set.id === currentSet?.id ? '#eff6ff' : '#ffffff', border: set.id === currentSet?.id ? '1px solid #93c5fd' : '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = set.id === currentSet?.id ? '#93c5fd' : '#e2e8f0'; e.currentTarget.style.backgroundColor = set.id === currentSet?.id ? '#eff6ff' : '#ffffff'; }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: '#1e293b', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{set.title}</span>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(set.verses?.length || 0)} {t("節經文", "verses")} · {(viewCounts[set.id] || 0)} {t("點閱次數", "views")}
                    </span>
                  </span>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {set.id === currentSet?.id ? t("目前選擇", "Current") : t("查看", "Open")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
