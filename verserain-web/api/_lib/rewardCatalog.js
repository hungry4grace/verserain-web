// Static catalogue of the e-vouchers the sponsored-rewards programme hands
// out, per region, plus the default face value per reward kind. The admin
// picks the actual voucher at send time; players state a preference when they
// claim. Labels are proper names (shown to every language as-is).
export const REGIONS = ['tw', 'intl'];

export const CATALOG = {
  tw: [
    { id: 'line_points', label: 'LINE POINTS', currency: 'TWD' },
    { id: 'seven_eleven', label: '7-ELEVEN 電子禮券', currency: 'TWD' },
    { id: 'starbucks_tw', label: '星巴克電子券 Starbucks TW', currency: 'TWD' },
    { id: 'bookstore_tw', label: '校園書房／道聲 禮券', currency: 'TWD' },
  ],
  intl: [
    { id: 'amazon_us', label: 'Amazon.com eGift', currency: 'USD' },
    { id: 'starbucks_us', label: 'Starbucks US eGift', currency: 'USD' },
  ],
};

// Default face value by reward kind and currency.
export const DEFAULT_VALUE = {
  verses: { TWD: 300, USD: 10 },
  invites: { TWD: 500, USD: 15 },
};

export const isValidRegion = (r) => REGIONS.includes(String(r || ''));
export const regionCurrency = (region) => (region === 'intl' ? 'USD' : 'TWD');
export const isValidCurrency = (c) => c === 'TWD' || c === 'USD';

export function voucherFor(region, id) {
  return (CATALOG[region] || []).find((v) => v.id === id) || null;
}

export function defaultValueFor(kind, currency) {
  return (DEFAULT_VALUE[kind] || DEFAULT_VALUE.verses)[currency] || 0;
}
