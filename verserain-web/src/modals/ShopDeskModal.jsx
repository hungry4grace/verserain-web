// 收銀台 — the shop owner's own view of the coupons customers just made for
// this shop. Staff match the name and amount the customer shows, then tap
// 「確認折抵」: the confirm happens on the shop's phone, so a customer's
// screenshot proves nothing. Polls while open and the page is visible.
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Modal, toast } from '../ui';

const POLL_MS = 6000;
const RECENT_MS = 30 * 60 * 1000;

const timeAgo = (t, iso, nowMs) => {
  const min = Math.max(0, Math.round((nowMs - Date.parse(iso || 0)) / 60000));
  return min < 1 ? t('剛剛', 'just now') : t('{n} 分鐘前', '{n} min ago').replace('{n}', String(min));
};

export default function ShopDeskModal({ t, place, userEmail, sessionKey, redeemErrorText, setShowLoginModal, onClose }) {
  const [data, setData] = useState(null); // { vouchers } | { error }
  const [busyCode, setBusyCode] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; });
  const placeId = place?.id || '';

  const load = useCallback(async () => {
    if (!placeId || !userEmail) return;
    try {
      const q = new URLSearchParams({ scope: 'place', placeId, email: userEmail, sessionKey: sessionKey || '' });
      const res = await fetch(`/api/redeem-history?${q}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      setData(res.ok ? { vouchers: Array.isArray(d.vouchers) ? d.vouchers : [] } : { error: d.error || String(res.status) });
    } catch (e) {
      setData({ error: String(e?.message || e) });
    }
    setNowMs(Date.now());
  }, [placeId, userEmail, sessionKey]);

  useEffect(() => {
    if (!placeId) return undefined;
    setData(null);
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(id);
  }, [placeId, load]);

  const confirmUse = async (v) => {
    setBusyCode(v.code);
    try {
      const res = await fetch('/api/redeem-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'owner_use', code: v.code, placeId, email: userEmail, sessionKey }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || String(res.status));
      toast.success(tRef.current('已確認 {name} 折抵 NT${n}', 'Confirmed: NT${n} off for {name}').replace('{name}', v.holder || '').replace('{n}', String(v.ntd)));
    } catch (e) {
      const code = String(e?.message || e);
      if (code === 'session_invalid' || code === 'login_required') setShowLoginModal('login');
      toast.error(redeemErrorText(code));
    } finally {
      setBusyCode('');
      load();
    }
  };

  const list = data?.vouchers || [];
  const open = list.filter(v => (v.computedStatus || v.status) === 'issued').sort((a, b) => Date.parse(b.issuedAt || 0) - Date.parse(a.issuedAt || 0));
  const recent = list.filter(v => (v.computedStatus || v.status) === 'used' && nowMs - Date.parse(v.usedAt || 0) < RECENT_MS).sort((a, b) => Date.parse(b.usedAt || 0) - Date.parse(a.usedAt || 0));

  const card = { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface)' };

  return (
    <Modal open={!!place} title={t('收銀台：{name}', 'Checkout desk: {name}').replace('{name}', place?.name || '')} onClose={onClose} closeLabel={t('關閉', 'Close')} testId="shop-desk-modal">
      <p style={{ marginTop: 0 }}>
        {t('客人產生折扣券後會出現在這裡。請對照客人手機上的名字、代碼和金額，再按「確認折抵」。', 'Coupons customers make for your shop show up here. Check the name, code and amount on the customer’s phone, then tap “Confirm”.')}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <b style={{ color: 'var(--color-text)' }}>{t('等待確認', 'Waiting to confirm')}{data && !data.error ? ` (${open.length})` : ''}</b>
        <Button variant="text" size="sm" icon={<RefreshCw size={16} />} onClick={load}>{t('重新整理', 'Refresh')}</Button>
      </div>
      {!data ? (
        <div>{t('載入中…', 'Loading…')}</div>
      ) : data.error ? (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <span>{redeemErrorText(data.error)}</span>
          {data.error === 'session_invalid' && <Button size="sm" onClick={() => setShowLoginModal('login')}>{t('重新登入', 'Sign in again')}</Button>}
        </div>
      ) : open.length === 0 ? (
        <div data-testid="shop-desk-empty" style={{ ...card, textAlign: 'center' }}>{t('目前沒有等待確認的折扣券', 'No coupons waiting right now')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {open.map(v => (
            <div key={v.code} data-testid="shop-desk-open" style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: 'var(--fs-heading)' }}>
                  {v.holder || '—'} · {t('折 NT${n}', 'NT${n} off').replace('{n}', String(v.ntd))}
                </div>
                <div>
                  {t('消費 NT${bill}', 'Bill NT${bill}').replace('{bill}', String(v.billNTD))} · <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{v.formatted || v.code}</span> · {timeAgo(t, v.issuedAt, nowMs)}
                </div>
              </div>
              <Button loading={busyCode === v.code} disabled={!!busyCode && busyCode !== v.code} onClick={() => confirmUse(v)} data-testid="shop-desk-confirm">{t('確認折抵', 'Confirm')}</Button>
            </div>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <>
          <div style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)', fontWeight: 700, color: 'var(--color-text)' }}>{t('最近 30 分鐘已確認', 'Confirmed in the last 30 min')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {recent.map(v => (
              <div key={v.code} data-testid="shop-desk-used">
                ✓ {v.holder || '—'} · {t('折 NT${n}', 'NT${n} off').replace('{n}', String(v.ntd))} · {timeAgo(t, v.usedAt, nowMs)}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
