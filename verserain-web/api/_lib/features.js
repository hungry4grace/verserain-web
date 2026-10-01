// Feature switches shared by the API routes and the app (no imports, so the
// client can import this file directly).

// 愛心行動 (charity pools: putting points into a pool, shops joining one,
// redeeming pool credit) is paused while the model is thought through. The code
// and data stay; flip to true to offer it again.
export const SHOW_CHARITY = false;

// Place kinds anyone may self-register on the map. 機構 (org) is paused; churches
// stay open because they host 讀經比賽. Admins can still add any kind, and
// places that already exist keep their kind.
export const OPEN_PLACE_KINDS = ['merchant', 'church'];
