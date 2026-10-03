// The message for a refused 統一編號／立案字號 — shown under the field as the
// shop types and again if they submit anyway. '' when the value is fine.
import { normalizeTaxId, taxIdProblem } from '../../api/_lib/places.js';

export const FINDBIZ_URL = 'https://findbiz.nat.gov.tw/';

export function taxIdErrorText(t, kind, value) {
  const problem = taxIdProblem(kind, value);
  if (problem === 'empty') return kind === 'merchant' ? t('請填寫 8 位數的統一編號', 'Please enter the 8-digit 統一編號') : t('請填寫統一編號或立案字號', 'Please enter a 統一編號 or registration number');
  if (problem === 'digits') return t('統一編號只能是 8 位數字', 'The 統一編號 must be 8 digits');
  if (problem === 'length') return t('統一編號是 8 位數字（目前 {n} 位）', 'The 統一編號 has 8 digits (you entered {n})').replace('{n}', String(normalizeTaxId(value).length));
  if (problem === 'checksum') return t('這組 8 位數不是有效的統一編號，請對照統編證明或發票再確認一次', 'These 8 digits are not a valid 統一編號 — please check it against your registration or an invoice');
  if (problem === 'short') return t('立案字號太短，請填寫完整', 'The registration number is too short — please enter it in full');
  return '';
}

// Turn full-width digits into plain ones as the shop types (iPhone's Chinese
// keyboard), without touching spaces so a 立案字號 can still be typed.
export const halfWidthDigits = (value) => String(value ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
