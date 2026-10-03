// 店面海報 — preview, save and print the A4 poster for an approved shop
// (drawn by lib/shopPoster.js). Opened from 「我的登記」 on the merchant page.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button, Modal, toast } from '../ui';
import { drawShopPoster } from '../lib/shopPoster.js';

function posterTexts(t, place) {
  return {
    brand: t('經文雨', 'VerseRain'),
    brandSub: t('VerseRain 讀經點數折抵', 'Bible-reading points discount'),
    partner: t('合作商家', 'Partner shop'),
    discount: t('讀經點數折抵 {n}%', '{n}% off with reading points').replace('{n}', String(Number(place.discountPct) || 0)),
    steps: [
      t('用手機相機掃描 QR code', 'Scan the QR code with your phone camera'),
      t('輸入消費金額，產生折扣券', 'Enter the bill to get a discount coupon'),
      t('結帳時出示給店員確認', 'Show it to the staff at checkout'),
    ],
    fine: t('需先登入經文雨並通過 3 節經文。優惠由商家自行提供；點數無現金價值、不可兌換現金。', 'Sign in to VerseRain and pass 3 verses first. The discount is offered by the shop; points have no cash value and cannot be cashed out.'),
    site: 'www.verserain.com',
  };
}

export default function ShopPosterModal({ t, place, onClose }) {
  const canvasRef = useRef(null);
  const tRef = useRef(t);
  useLayoutEffect(() => { tRef.current = t; });
  const [readyFor, setReadyFor] = useState(null);
  const ready = !!place && readyFor === place.id;

  // Draw once per shop (t is re-created on every App render).
  useEffect(() => {
    let cancelled = false;
    if (!place || !canvasRef.current) return undefined;
    const tt = tRef.current;
    drawShopPoster(canvasRef.current, place, posterTexts(tt, place))
      .then(() => { if (!cancelled) setReadyFor(place.id); })
      .catch(() => { if (!cancelled) toast.error(tt('海報產生失敗，請再試一次', 'Could not make the poster — please try again')); });
    return () => { cancelled = true; };
  }, [place]);

  const fileName = `verserain-${String(place?.name || 'shop').replace(/[\\/:*?"<>|\s]+/g, '-')}.png`;

  // Phones: the share sheet (save to Photos, AirDrop, print). Elsewhere: a download.
  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: place.name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  };

  // Print just the poster, one A4 page, from a hidden iframe.
  const print = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><title>${fileName}</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0}img{display:block;width:100%;height:auto}</style></head><body><img src="${canvas.toDataURL('image/png')}"></body></html>`);
    doc.close();
    const img = doc.querySelector('img');
    const go = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch { toast.error(t('無法列印，請先儲存圖片再列印', 'Could not print — save the image and print it instead')); }
      setTimeout(() => frame.remove(), 60000);
    };
    if (img.complete) go(); else img.onload = go;
  };

  return (
    <Modal
      open={!!place}
      title={t('店面海報', 'Shop poster')}
      onClose={onClose}
      closeLabel={t('關閉', 'Close')}
      testId="shop-poster-modal"
      footer={(
        <>
          <Button variant="secondary" icon={<Download size={18} />} disabled={!ready} onClick={save} data-testid="shop-poster-save">{t('儲存圖片', 'Save image')}</Button>
          <Button icon={<Printer size={18} />} disabled={!ready} onClick={print} data-testid="shop-poster-print">{t('列印', 'Print')}</Button>
        </>
      )}
    >
      <p style={{ marginTop: 0 }}>
        {t('印出來貼在櫃台或門口。客人掃描後會直接打開這家店的折扣券，結帳時仍由店員確認。', 'Print it and put it by the till or the door. Scanning opens this shop’s discount coupon straight away; the staff still confirm it at checkout.')}
      </p>
      <canvas
        ref={canvasRef}
        data-testid="shop-poster-canvas"
        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1240 / 1754', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      />
    </Modal>
  );
}
