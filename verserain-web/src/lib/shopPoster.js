// 店面海報 — the printable A4 poster an approved shop puts up by the till:
// VerseRain logo, the shop's name and discount, and a QR that opens the shop's
// 「產生折扣券」 straight away (#shop/<placeId>). The staff still confirms each
// voucher, so the QR is a doorway, not a secret.
import QRCode from 'qrcode';
import { PUBLIC_APP_ORIGIN } from './routes.js';

export const POSTER_W = 1240; // A4 portrait at 150 dpi
export const POSTER_H = 1754;

export function shopLinkUrl(placeId) {
  return `${PUBLIC_APP_ORIGIN}/#shop/${encodeURIComponent(placeId)}`;
}

const FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", system-ui, sans-serif';

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Break text into lines that fit maxWidth, character by character (CJK has no
// spaces), keeping Latin words whole where possible.
function wrapLines(ctx, text, maxWidth) {
  const tokens = String(text || '').match(/[A-Za-z0-9'’&.-]+|\s+|./gu) || [];
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    const next = line + tok;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd());
      line = tok.trimStart();
    } else line = next;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// The largest font size (down to min) at which text fits in maxLines lines.
function fitText(ctx, text, { weight, max, min, maxWidth, maxLines }) {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${FONT}`;
  return { size: min, lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// texts: { brand, brandSub, partner, discount, steps: [3], fine, site }
export async function drawShopPoster(canvas, place, texts) {
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext('2d');
  const W = POSTER_W;
  const cx = W / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, POSTER_H);

  // Header band
  const grad = ctx.createLinearGradient(0, 0, W, 320);
  grad.addColorStop(0, '#60a5fa');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 320);
  const logo = await loadImage('/icons/icon-512.png');
  const logoSize = 190;
  const brandX = logo ? 330 : cx;
  if (logo) {
    ctx.save();
    roundRect(ctx, 100, 65, logoSize, logoSize, 44);
    ctx.clip();
    ctx.drawImage(logo, 100, 65, logoSize, logoSize);
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = logo ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 120px ${FONT}`;
  ctx.fillText(texts.brand, brandX, 180);
  ctx.font = `600 52px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(texts.brandSub, brandX, 245);

  // Shop name
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(texts.partner, cx, 400);
  const name = fitText(ctx, place.name, { weight: 900, max: 104, min: 60, maxWidth: W - 160, maxLines: 2 });
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 ${name.size}px ${FONT}`;
  let y = 400 + name.size + 20;
  name.lines.forEach((line, i) => ctx.fillText(line, cx, y + i * name.size * 1.15));
  y += (name.lines.length - 1) * name.size * 1.15 + 40;

  // Discount pill
  ctx.font = `800 56px ${FONT}`;
  const pillW = ctx.measureText(texts.discount).width + 100;
  ctx.fillStyle = '#fef3c7';
  roundRect(ctx, cx - pillW / 2, y, pillW, 96, 48);
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.fillText(texts.discount, cx, y + 68);
  y += 96 + 36;

  // Bottom block first (fine print, site), then the steps above it, so the
  // QR takes whatever room a one- or two-line shop name leaves.
  ctx.font = `500 30px ${FONT}`;
  const fine = wrapLines(ctx, texts.fine, W - 200).slice(0, 2);
  const siteY = POSTER_H - 50;
  const fineTop = siteY - 60 - fine.length * 42;
  const stepGap = 76;
  const firstStepY = fineTop - 50 - (texts.steps.length - 1) * stepGap;

  // QR
  const frame = Math.min(640, firstStepY - 70 - y);
  const qrSize = frame - 60;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, shopLinkUrl(place.id), { width: qrSize, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } });
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 8;
  roundRect(ctx, cx - frame / 2, y, frame, frame, 36);
  ctx.fill();
  ctx.stroke();
  ctx.drawImage(qr, cx - qrSize / 2, y + 30, qrSize, qrSize);

  // Steps
  const stepX = 150;
  texts.steps.forEach((step, i) => {
    const sy = firstStepY + i * stepGap;
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(stepX + 30, sy - 16, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(String(i + 1), stepX + 30, sy - 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    const fit = fitText(ctx, step, { weight: 700, max: 44, min: 30, maxWidth: W - stepX - 150, maxLines: 1 });
    ctx.font = `700 ${fit.size}px ${FONT}`;
    ctx.fillText(fit.lines[0] || '', stepX + 90, sy);
  });

  // Fine print + site
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = `500 30px ${FONT}`;
  fine.forEach((line, i) => ctx.fillText(line, cx, fineTop + 30 + i * 42));
  ctx.fillStyle = '#2563eb';
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText(texts.site, cx, siteY);
  return canvas;
}
