/* ============================================================
   BikeBuddy — settings.js
   Per-account theme (light/dark) + language (English/Tagalog).
   Naka-save ang settings SA LOOB ng account mismo (user.settings),
   kaya hindi nadadamay ang ibang account. Napapalitan lang ito
   kapag ang may-ari ng account mismo ang nag-set (naka-login).
   Kapag walang naka-login, default (light + English) ang gamit.
   ============================================================ */

const Settings = {
  DEFAULTS: { theme: 'light', lang: 'en' },

  forUser(user){
    const s = Object.assign({}, this.DEFAULTS, (user && user.settings) || {});
    if(s.theme !== 'dark') s.theme = 'light';
    if(s.lang !== 'tl') s.lang = 'en';
    return s;
  },

  apply(s){
    document.documentElement.setAttribute('data-theme', s.theme);
    const meta = document.getElementById('meta-theme-color');
    if(meta) meta.setAttribute('content', s.theme === 'dark' ? '#0F1218' : '#F5F6F1');
    I18n.setLang(s.lang);
    this.syncUI(s);
  },

  applyForUser(user){ this.apply(this.forUser(user)); },
  applyDefault(){ this.apply(this.DEFAULTS); },

  /* Tanging ang naka-login na may-ari lang ang makakapagbago */
  update(patch){
    const me = Auth.currentUser();
    if(!me) return;
    const users = DB.getUsers();
    const idx = users.findIndex(u => u.id === me.id);
    if(idx === -1) return;
    const next = Object.assign({}, this.forUser(users[idx]));
    if(patch.theme === 'light' || patch.theme === 'dark') next.theme = patch.theme;
    if(patch.lang === 'en' || patch.lang === 'tl') next.lang = patch.lang;
    users[idx].settings = next;
    DB.saveUsers(users);
    this.apply(next);
    App.rerenderDynamic();
    App.toast(t('toast.settingsSaved'));
  },

  syncUI(s){
    s = s || this.forUser(Auth.currentUser());
    document.querySelectorAll('[data-set-theme]').forEach(b => {
      const on = b.dataset.setTheme === s.theme;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
    document.querySelectorAll('[data-set-lang]').forEach(b => {
      const on = b.dataset.setLang === s.lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
  },

  bind(){
    document.addEventListener('click', e => {
      const themeBtn = e.target.closest('[data-set-theme]');
      if(themeBtn){ this.update({ theme: themeBtn.dataset.setTheme }); return; }
      const langBtn = e.target.closest('[data-set-lang]');
      if(langBtn){ this.update({ lang: langBtn.dataset.setLang }); }
    });
  }
};
