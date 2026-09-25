/* ============================================================
   PwaManager — service worker registration, "Install app" prompt, and the
   "new version available → reload" flow. Service workers only run over
   http(s) (e.g. the Vercel deployment or a local server), not file://.
   ============================================================ */
class PwaManager {
    constructor(app) {
        this.app = app;
        this.deferredPrompt = null;
        this.registration = null;
        this.waiting = null;
    }

    get supported() { return 'serviceWorker' in navigator && location.protocol.startsWith('http'); }
    get isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
    get canInstall() { return !!this.deferredPrompt; }
    get isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this._refreshButtons();
        });
        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this._refreshButtons();
            this.app.ui.toast('App installed! You can now open it from your home screen or desktop.');
        });
        if (!this.supported) return;
        navigator.serviceWorker.register('./sw.js').then(reg => {
            this.registration = reg;
            if (reg.waiting && navigator.serviceWorker.controller) this._updateReady(reg.waiting);
            reg.addEventListener('updatefound', () => {
                const sw = reg.installing;
                if (!sw) return;
                sw.addEventListener('statechange', () => {
                    if (sw.state === 'installed' && navigator.serviceWorker.controller) this._updateReady(sw);
                });
            });
        }).catch(err => console.warn('Service worker registration failed:', err));
        // Only reload when the user asked for the update — the very first install also fires
        // controllerchange (clients.claim), and reloading then would yank the page for no reason.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!this._reloadRequested) return;
            this._reloadRequested = false;
            location.reload();
        });
    }

    _updateReady(worker) {
        this.waiting = worker;
        this.app.ui.toast('A new version of the app is available.', 'info', { duration: 0, actionLabel: 'Reload', onAction: () => this.applyUpdate() });
        this._refreshButtons();
    }
    applyUpdate() {
        if (!this.waiting) return location.reload();
        this._reloadRequested = true;
        this.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    async checkForUpdate() {
        if (!this.registration) return this.app.ui.toast(this.supported ? 'Service worker not ready yet.' : 'Updates are checked automatically when the app is served over the web.', 'info');
        await this.registration.update();
        if (!this.waiting) this.app.ui.toast('You are on the latest version.', 'info');
    }

    async install() {
        if (!this.deferredPrompt) {
            const how = this.isIOS
                ? 'On iPhone/iPad: tap the Share button in Safari, then "Add to Home Screen".'
                : this.isStandalone ? 'The app is already installed and running as an app.'
                : 'Use your browser menu → "Install app" / "Add to Home screen". (Chrome/Edge show an install icon in the address bar.)';
            return this.app.ui.alert({ title: this.isStandalone ? 'Already installed' : 'Install Bebang BMS', icon: 'install', tone: this.isStandalone ? 'success' : 'info', message: how, confirmLabel: 'Got it' });
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') this.deferredPrompt = null;
        this._refreshButtons();
    }

    _refreshButtons() {
        const headerBtn = document.getElementById('header-install-btn');
        if (headerBtn) headerBtn.classList.toggle('hidden', !this.canInstall);
        if (this.app.currentTab === 'settings') this.app.settings.refreshAppCard();
    }
}
