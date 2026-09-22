// Leaflet is loaded from a CDN at runtime (it is not an npm dependency), once
// per page. WorldMap2D needs the MarkerCluster plugin too; the merchant
// registration pin map only needs plain Leaflet.
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const CLUSTER_JS = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
const CLUSTER_CSS = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';

function addCss(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet'; link.href = href;
  document.head.appendChild(link);
}
function addScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

let leafletPromise = null;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    addCss('leaflet-css', LEAFLET_CSS);
    leafletPromise = addScript(LEAFLET_JS).then(() => window.L);
  }
  return leafletPromise;
}

let clusterPromise = null;
export function loadLeafletAndCluster() {
  if (window.L && window.L.markerClusterGroup) return Promise.resolve(window.L);
  if (!clusterPromise) {
    addCss('leaflet-cluster-css', CLUSTER_CSS);
    clusterPromise = loadLeaflet().then(() => addScript(CLUSTER_JS)).then(() => window.L);
  }
  return clusterPromise;
}
