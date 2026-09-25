/* ============================================================
   AuthService — the shared email/password login that gates the synced data.
   A no-op when Firebase isn't configured (the login screen never shows then).
   ============================================================ */
class AuthService {
    constructor(app, cloud) {
        this.app = app;
        this.cloud = cloud;
    }
    get user() { return this.cloud.user; }

    _showError(msg, ok = false) {
        const box = document.getElementById('auth-error');
        box.textContent = msg;
        box.classList.toggle('hidden', !msg);
        box.classList.toggle('text-red-400', !ok);
        box.classList.toggle('bg-red-500/10', !ok);
        box.classList.toggle('text-green-400', ok);
        box.classList.toggle('bg-green-500/10', ok);
    }

    /** "Continue with Google" — popup on desktop, full-page redirect where popups don't work (installed app, some phones). */
    async signInWithGoogle() {
        this._showError('');
        const btn = document.getElementById('google-signin-btn');
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        if (btn) { btn.disabled = true; btn.classList.add('loading'); }
        try {
            if (this.app.pwa.isStandalone) return await this.cloud.auth.signInWithRedirect(provider);
            await this.cloud.auth.signInWithPopup(provider);
        } catch (error) {
            if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(error.code)) {
                try { return await this.cloud.auth.signInWithRedirect(provider); } catch (e) { error = e; }
            }
            if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) this._showError(this.friendlyError(error));
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
        }
    }
    /** Shows any error from a redirect-based Google sign-in when the page comes back. */
    async handleRedirectResult() {
        try { await this.cloud.auth.getRedirectResult(); } catch (error) { this._showError(this.friendlyError(error)); }
    }
    toggleEmailLogin(open) {
        const box = document.getElementById('auth-email-form');
        const show = open ?? box.classList.contains('hidden');
        box.classList.toggle('hidden', !show);
        if (show) document.getElementById('auth-email').focus();
    }

    async signIn() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        this._showError('');
        if (!email || !password) return this._showError('Please enter both email and password.');
        const btn = document.getElementById('auth-signin-btn');
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        try {
            this.app.welcome.resetSession();
            await this.cloud.auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged (BebangApp.start) takes it from here.
        } catch (error) {
            this._showError(this.friendlyError(error));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    }

    async resetPassword() {
        const email = document.getElementById('auth-email').value.trim();
        if (!email) return this._showError('Type the account email above first, then click "Forgot password?".');
        try {
            await this.cloud.auth.sendPasswordResetEmail(email);
            this._showError(`Password reset email sent to ${email}. Check the inbox (and spam folder).`, true);
        } catch (error) {
            this._showError(this.friendlyError(error));
        }
    }

    /** Settings → Account: emails a password reset to the signed-in account (password logins only). */
    async sendResetForCurrent() {
        const user = this.user;
        if (!user) return;
        const hasPassword = (user.providerData || []).some(p => p.providerId === 'password');
        if (!hasPassword) return this.app.ui.alert({ title: 'Managed by Google', icon: 'info', tone: 'info', message: 'This account signs in with Google, so its password is managed in your Google account, not here.' });
        if (!(await this.app.ui.confirm({ title: 'Send a password reset email?', icon: 'info', tone: 'info', confirmLabel: 'Send Email', message: `A reset link will be sent to ${user.email}.` }))) return;
        try {
            await this.cloud.auth.sendPasswordResetEmail(user.email);
            this.app.ui.toast(`Password reset email sent to ${user.email}.`);
        } catch (error) {
            this.app.ui.toast(this.friendlyError(error), 'error');
        }
    }

    togglePasswordVisibility() {
        const input = document.getElementById('auth-password');
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    async signOut({ ask = true } = {}) {
        const email = this.user ? this.user.email : '';
        if (ask && !(await this.app.ui.confirm({
            title: 'Log out?', icon: 'logout', tone: 'warning', confirmLabel: 'Log out', cancelLabel: 'Stay signed in',
            message: `You're signed in${email ? ` as ${email}` : ''}. You'll need the shared login to get back in.`,
            note: 'Your data stays safely synced in the cloud.'
        }))) return;
        this.app.welcome.resetSession();
        this.cloud.auth.signOut();
    }

    friendlyError(error) {
        const messages = {
            'auth/invalid-email': 'That email address looks invalid.',
            'auth/user-not-found': 'No account with that email. Ask the owner for the shared login.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Incorrect email or password.',
            'auth/invalid-login-credentials': 'Incorrect email or password.',
            'auth/user-disabled': 'This account has been disabled in Firebase.',
            'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
            'auth/network-request-failed': "No internet connection. Try again once you're back online.",
            'auth/unauthorized-domain': `This website (${location.hostname}) isn't on Firebase's list of authorized domains yet. The administrator needs to add it in Firebase Console → Authentication → Settings → Authorized domains.`,
            'auth/operation-not-allowed': 'Google sign-in is not turned on yet. The administrator needs to enable it in Firebase Console → Authentication → Sign-in method.',
            'auth/account-exists-with-different-credential': 'An account with this email already exists with a different sign-in method. Try the email login instead.',
            'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.'
        };
        return messages[error.code] || `Sign-in error: ${error.message}`;
    }
}
