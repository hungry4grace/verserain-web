// What fruit is — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Apple, Share2, TreePine, X } from 'lucide-react';

export default function FruitInfoModal({ t, creatorPoints, localFruits, setShowFruitInfo, totalFruits }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowFruitInfo(false)}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
          <h3 style={{ margin: 0, color: '#b45309', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Apple size={22} /> {t("果子數量怎麼算？", "How are fruits counted?")}
          </h3>
          <button onClick={() => setShowFruitInfo(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: '#475569', lineHeight: '1.7', fontSize: '0.97rem' }}>
            {t("你的總果子數量由兩部分組成：", "Your total fruit count has two components:")}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#f0fdf4', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #bbf7d0' }}>
              <TreePine size={24} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '0.2rem' }}>
                  {t("遊戲果子", "Game Fruits")} — <span style={{ color: '#d97706' }}>{localFruits}</span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {t("每次挑戰一節已「過關」的經文並創下個人最高分，這棵樹就會結出一顆果子。果子數量就是你在「我的園子」裡所有樹上果子的總和。", "Each time you beat your personal best on a verse you've already cleared, that tree bears a fruit. This total counts all fruits across every tree in your garden.")}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#eff6ff', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #bfdbfe' }}>
              <Share2 size={24} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.2rem' }}>
                  {t("推廣點數", "Referral Points")} — <span style={{ color: '#d97706' }}>{creatorPoints}</span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {t("當你分享的邀請連結帶來新玩家，或你創作了廣受歡迎的自訂經文組，系統會自動為你累積推廣點數。", "When your invite link brings in new players, or your custom verse sets are widely used, the system automatically adds referral points to your total.")}
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ color: '#92400e', fontWeight: 'bold', fontSize: '0.95rem' }}>
              <Apple size={18} /> {t("遊戲果子", "Game")} {localFruits} + {t("推廣點數", "Referral")} {creatorPoints}
            </span>
            <span style={{ color: '#b45309', fontWeight: 'bold', fontSize: '1.1rem' }}>
              = {totalFruits}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
