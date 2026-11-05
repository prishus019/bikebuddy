/* ============================================================
   BikeBuddy — app.js
   View routing, modal helpers, toast, nav wiring, splash, boot.
   ============================================================ */

const App = {
  SPLASH_MS: 2800,
  deferredInstall: null,

  /* ---------------- VIEW / PANEL HELPERS ---------------- */
  showView(viewId){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    Notifs.closePanels();
    window.scrollTo({ top: 0 });
  },

  switchPanel(scope, panelName){
    const root = scope === 'admin' ? document.getElementById('view-admin') : document.getElementById('view-client');
    root.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === panelName));
    root.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + panelName));
    Notifs.closePanels();
    window.scrollTo({ top: 0 });
  },

  openModal(id){ document.getElementById(id).classList.add('active'); },
  closeModal(id){ document.getElementById(id).classList.remove('active'); },

  toast(message){
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  },

  /* Re-render lahat ng dynamic na text kapag nagpalit ng wika */
  rerenderDynamic(){
    const session = DB.getSession();
    if(!session) return;
    if(session.role === 'admin') Admin.refreshAll();
    else Client.renderAll();
    Notifs.refreshBell();
  },

  /* ---------------- AUTH SCREEN WIRING ---------------- */
  setAuthRole(role){
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
    document.getElementById('client-mode-toggle').classList.toggle('hidden', role === 'admin');
    document.getElementById('form-client-login').classList.toggle('hidden', role !== 'client');
    document.getElementById('form-client-register').classList.add('hidden');
    document.getElementById('form-admin-login').classList.toggle('hidden', role !== 'admin');
    if(role === 'client'){
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'login'));
    }
  },

  setAuthMode(mode){
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.getElementById('form-client-login').classList.toggle('hidden', mode !== 'login');
    document.getElementById('form-client-register').classList.toggle('hidden', mode !== 'register');
  },

  goToAuth(preset){
    this.showView('view-auth');
    if(preset === 'admin'){ this.setAuthRole('admin'); }
    else if(preset === 'client-register'){ this.setAuthRole('client'); this.setAuthMode('register'); }
    else { this.setAuthRole('client'); this.setAuthMode('login'); }
  },

  /* ---------------- SESSION ROUTING ---------------- */
  enterAsClient(){
    Client.init();
    this.switchPanel('client', 'client-home');
    this.showView('view-client');
    Notifs.refreshBell();
    Notifs.startWatcher();
  },
  enterAsAdmin(){
    Admin.init();
    this.switchPanel('admin', 'admin-dashboard');
    this.showView('view-admin');
    Notifs.refreshBell();
    Notifs.startWatcher();
  },

  routeFromSession(){
    const session = DB.getSession();
    const user = Auth.currentUser();
    if(!session || !user){
      if(session) DB.clearSession();
      Settings.applyDefault();
      this.showView('view-landing');
      return;
    }
    // Ang settings ng may-ari ng account ang ia-apply
    Settings.applyForUser(user);
    if(session.role === 'admin') this.enterAsAdmin();
    else this.enterAsClient();
  },

  logout(){
    Auth.logout();
    Notifs.stopWatcher();
    Client.stop();
    Notifs.refreshBell();
    Settings.applyDefault();          // balik sa default pag wala nang naka-login
    this.refreshLandingStats();
    this.showView('view-landing');
  },

  refreshLandingStats(){
    const bikes = DB.getBikes();
    const availableCount = bikes.filter(b => b.status === 'Available').length;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('stat-bikes', bikes.length);
    set('stat-available', availableCount);
    set('stat-available-floating', availableCount);
  },

  /* ---------------- SPLASH / LOADING SCREEN ---------------- */
  startSplash(){
    const splash = document.getElementById('splash');
    if(!splash) return;
    document.body.classList.add('splashing');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = reduce ? 900 : this.SPLASH_MS;

    const keys = ['splash.m1', 'splash.m2', 'splash.m3', 'splash.m4'];
    const status = document.getElementById('splash-status');
    let i = 0;
    const setMsg = () => { if(status) status.textContent = t(keys[Math.min(i, keys.length - 1)]); };
    setMsg();
    const msgTimer = setInterval(() => { i++; setMsg(); if(i >= keys.length - 1) clearInterval(msgTimer); }, total / keys.length);

    setTimeout(() => {
      clearInterval(msgTimer);
      splash.classList.add('hide');
      document.body.classList.remove('splashing');
      setTimeout(() => splash.remove(), 700);
    }, total);
  },

  /* ---------------- PHONE / PWA ---------------- */
  setupPWA(){
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    const toggleInstall = show => document.querySelectorAll('.install-btn').forEach(b => b.classList.toggle('hidden', !show));
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredInstall = e;
      toggleInstall(true);
    });
    window.addEventListener('appinstalled', () => { this.deferredInstall = null; toggleInstall(false); });
    document.querySelectorAll('.install-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(!this.deferredInstall) return;
        this.deferredInstall.prompt();
        await this.deferredInstall.userChoice;
        this.deferredInstall = null;
        toggleInstall(false);
      });
    });
  },

  /* ---------------- BOOT ---------------- */
  boot(){
    seedIfEmpty();
    Settings.bind();
    Notifs.init();
    this.setupPWA();
    I18n.apply();

    // Landing CTAs
    document.querySelectorAll('[data-goto-auth]').forEach(btn => {
      btn.addEventListener('click', () => this.goToAuth(btn.dataset.gotoAuth));
    });
    document.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => this.showView(btn.dataset.goto));
    });

    // Role / mode toggles
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setAuthRole(btn.dataset.role));
    });
    document.querySelectorAll('.mode-btn, [data-mode]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.setAuthMode(el.dataset.mode);
      });
    });

    // Client login
    document.getElementById('form-client-login').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const res = Auth.login('client', f.identifier.value.trim(), f.password.value);
      if(!res.ok){ this.toast(res.message); return; }
      f.reset();
      Settings.applyForUser(res.user);     // settings ng account na ito
      this.toast(t('toast.welcomeBack', { name: res.user.name.split(' ')[0] }));
      this.enterAsClient();
    });

    // Client register
    document.getElementById('form-client-register').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const res = Auth.register({
        name: f.name.value.trim(), email: f.email.value.trim(),
        contact: f.contact.value.trim(), address: f.address.value.trim(), password: f.password.value
      });
      if(!res.ok){ this.toast(res.message); return; }
      f.reset();
      Settings.applyForUser(res.user);
      this.toast(t('toast.welcomeNew', { name: res.user.name.split(' ')[0] }));
      this.enterAsClient();
    });

    // Admin login
    document.getElementById('form-admin-login').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const res = Auth.login('admin', f.identifier.value.trim(), f.password.value);
      if(!res.ok){ this.toast(res.message); return; }
      f.reset();
      Settings.applyForUser(res.user);
      this.toast(t('toast.welcomeAdmin'));
      this.enterAsAdmin();
    });

    // Logout buttons
    document.getElementById('client-logout').addEventListener('click', () => this.logout());
    document.getElementById('admin-logout').addEventListener('click', () => this.logout());

    // App nav (client + admin)
    document.querySelectorAll('#view-client .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchPanel('client', btn.dataset.panel);
        if(btn.dataset.panel === 'client-home') Client.renderHome();
        if(btn.dataset.panel === 'client-rentals') Client.renderRentals();
        if(btn.dataset.panel === 'client-history') Client.renderHistory();
        if(btn.dataset.panel === 'client-profile') Client.fillProfile();
        if(btn.dataset.panel === 'client-settings') Settings.syncUI();
      });
    });
    document.querySelectorAll('#view-admin .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchPanel('admin', btn.dataset.panel);
        Admin.refreshAll();
        if(btn.dataset.panel === 'admin-settings') Settings.syncUI();
      });
    });

    // Modal close (backdrop click + × button)
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', e => { if(e.target === backdrop) backdrop.classList.remove('active'); });
    });

    // Stat strip on landing (visible even before login)
    this.refreshLandingStats();

    this.routeFromSession();
    this.startSplash();
  }
};

document.addEventListener('DOMContentLoaded', () => App.boot());
