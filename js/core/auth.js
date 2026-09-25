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

    togglePasswordVisibility() {
        const input = document.getElementById('auth-password');
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    async signOut() {
        const email = this.user ? this.user.email : '';
        if (!(await this.app.ui.confirm({
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
            'auth/network-request-failed': "No internet connection. Try again once you're back online."
        };
        return messages[error.code] || `Sign-in error: ${error.message}`;
    }
}
