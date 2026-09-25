/* ============================================================
   Service worker — makes Bebang BMS installable and fully usable offline.
   • App shell is precached per APP_VERSION (bump it in js/config/version.js on deploy).
   • Page navigations: network first (fresh when online), cached shell when offline.
   • Other same-origin files: cache first, refreshed in the background.
   • Cross-origin requests (Firebase / Google APIs) are never intercepted.
   ============================================================ */
importScripts('js/config/version.js');

const CACHE = `bebang-bms-${APP_VERSION}`;
const SHELL = 'index.html';
const ASSETS = [
    './', SHELL, 'Bebang2026.html', 'manifest.webmanifest',
    'css/app.css',
    'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
    'js/vendor/tailwind.js', 'js/vendor/localforage.min.js',
    'js/vendor/firebase-app-compat.js', 'js/vendor/firebase-auth-compat.js', 'js/vendor/firebase-firestore-compat.js',
    'js/config/version.js', 'js/config/tailwind.config.js', 'js/config/firebase-config.js',
    'js/data/seed.js',
    'js/core/utils.js', 'js/core/store.js', 'js/core/stock.js', 'js/core/finance.js', 'js/core/records.js', 'js/core/auth.js', 'js/core/pwa.js',
    'js/ui/ui.js', 'js/ui/dialog.js', 'js/ui/form-modal.js', 'js/ui/data-table.js', 'js/ui/printer.js', 'js/ui/widgets.js', 'js/ui/tour.js', 'js/ui/welcome.js',
    'js/pages/base-page.js', 'js/pages/dashboard-page.js', 'js/pages/procurement-page.js', 'js/pages/inventory-page.js',
    'js/pages/manufacturing-page.js', 'js/pages/sales-page.js', 'js/pages/reports-page.js', 'js/pages/costing-page.js',
    'js/pages/payroll-page.js', 'js/pages/settings-page.js',
    'js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('bebang-bms-') && k !== CACHE).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

// The page asks the waiting worker to take over when the user clicks "Reload" on the update toast.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                if (fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
                return fresh;
            } catch (err) {
                const cache = await caches.open(CACHE);
                return (await cache.match(req, { ignoreSearch: true })) || (await cache.match(SHELL)) || Response.error();
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req).then(res => {
            if (res.ok && res.type === 'basic') cache.put(req, res.clone());
            return res;
        }).catch(() => null);
        if (cached) {
            event.waitUntil(network);
            return cached;
        }
        return (await network) || Response.error();
    })());
});
