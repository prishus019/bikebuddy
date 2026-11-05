/* ============================================================
   BikeBuddy — notifications.js
   In-app notifications (bell icon) per account.
   Naka-save bilang { key, params } para nagta-translate kapag
   nagpalit ng wika ang may-ari ng account.
   ============================================================ */

const Notifs = {
  MAX_PER_USER: 50,
  SOON_MINUTES: 10,
  _timer: null,

  /* ---------------- DATA ---------------- */
  list(userId){
    return DB.getNotifs().filter(n => n.userId === userId).sort((a,b) => b.createdAt - a.createdAt);
  },
  unreadCount(userId){
    return DB.getNotifs().filter(n => n.userId === userId && !n.read).length;
  },

  push(userId, key, params, icon, opts){
    const all = DB.getNotifs();
    all.push({ id: DB.uid('n'), userId, key, params: params || {}, icon: icon || '🔔', createdAt: Date.now(), read: false });
    // Limitahan ang bilang bawat user
    const mine = all.filter(n => n.userId === userId).sort((a,b) => b.createdAt - a.createdAt);
    const drop = new Set(mine.slice(this.MAX_PER_USER).map(n => n.id));
    DB.saveNotifs(all.filter(n => !drop.has(n.id)));

    const me = Auth.currentUser();
    if(me && me.id === userId){
      this.refreshBell(true);
      if(opts && opts.toast) App.toast((icon || '🔔') + ' ' + t(key, params));
    }
  },

  pushToAdmins(key, params, icon, opts){
    DB.getUsers().filter(u => u.role === 'admin').forEach(a => this.push(a.id, key, params, icon, opts));
  },

  markAllRead(userId){
    const all = DB.getNotifs();
    let changed = false;
    all.forEach(n => { if(n.userId === userId && !n.read){ n.read = true; changed = true; } });
    if(changed) DB.saveNotifs(all);
  },

  clearAll(userId){
    DB.saveNotifs(DB.getNotifs().filter(n => n.userId !== userId));
  },

  /* ---------------- TIME-BASED ALERTS ---------------- */
  checkRentals(){
    const rentals = DB.getRentals();
    if(!rentals.length) return;
    const users = DB.getUsers();
    const bikes = DB.getBikes();
    let changed = false;
    const pending = [];

    rentals.forEach(r => {
      if(r.status !== 'Active') return;
      const left = (r.startTime + r.durationHours * 3600000) - Date.now();
      const bike = bikes.find(b => b.id === r.bikeId);
      const user = users.find(u => u.id === r.userId);
      const bikeName = bike ? bike.name : '—';

      if(left <= 0 && !r.overdueNotified){
        r.overdueNotified = true; r.soonNotified = true; changed = true;
        pending.push(() => {
          this.push(r.userId, 'n.rentalOverdue', { bike: bikeName }, '⚠️', { toast: true });
          this.pushToAdmins('n.a.overdue', { user: user ? user.name : '—', bike: bikeName }, '⚠️');
        });
      } else if(left > 0 && left <= this.SOON_MINUTES * 60000 && !r.soonNotified){
        r.soonNotified = true; changed = true;
        const min = Math.max(1, Math.ceil(left / 60000));
        pending.push(() => this.push(r.userId, 'n.rentalSoon', { bike: bikeName, min }, '⏰', { toast: true }));
      }
    });

    if(changed){
      DB.saveRentals(rentals);
      pending.forEach(fn => fn());
    }
  },

  startWatcher(){
    clearInterval(this._timer);
    this.checkRentals();
    this._timer = setInterval(() => { if(DB.getSession()) this.checkRentals(); }, 30000);
  },
  stopWatcher(){ clearInterval(this._timer); },

  /* ---------------- UI ---------------- */
  init(){
    document.querySelectorAll('.bell-wrap').forEach(wrap => {
      const btn = wrap.querySelector('.bell-btn');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = wrap.classList.contains('open');
        this.closePanels();
        if(!open) this.openPanel(wrap);
      });
      wrap.querySelector('.notif-panel').addEventListener('click', e => e.stopPropagation());
      wrap.querySelector('[data-notif-markread]').addEventListener('click', () => {
        const me = Auth.currentUser(); if(!me) return;
        this.markAllRead(me.id);
        this.renderPanel(wrap, true);
        this.refreshBell();
      });
      wrap.querySelector('[data-notif-clear]').addEventListener('click', () => {
        const me = Auth.currentUser(); if(!me) return;
        this.clearAll(me.id);
        this.renderPanel(wrap, true);
        this.refreshBell();
      });
    });
    document.addEventListener('click', () => this.closePanels());
    document.addEventListener('keydown', e => { if(e.key === 'Escape') this.closePanels(); });
    // Kapag may nagbago sa ibang tab (hal. admin tab vs client tab)
    window.addEventListener('storage', e => {
      if(e.key === DB.KEYS.NOTIFS) this.refreshBell(true);
    });
  },

  closePanels(){
    document.querySelectorAll('.bell-wrap.open').forEach(w => {
      w.classList.remove('open');
      w.querySelector('.notif-panel').classList.add('hidden');
      w.querySelector('.bell-btn').setAttribute('aria-expanded', 'false');
    });
  },

  openPanel(wrap){
    const me = Auth.currentUser(); if(!me) return;
    wrap.classList.add('open');
    wrap.querySelector('.notif-panel').classList.remove('hidden');
    wrap.querySelector('.bell-btn').setAttribute('aria-expanded', 'true');
    this.renderPanel(wrap);          // ipakita muna (may unread highlight)
    this.markAllRead(me.id);         // tapos markahan na nabasa
    this.refreshBell(false, true);
  },

  renderPanel(wrap, plain){
    const me = Auth.currentUser(); if(!me) return;
    const listEl = wrap.querySelector('.notif-list');
    const items = this.list(me.id);
    if(items.length === 0){
      listEl.innerHTML = `<div class="notif-empty"><span>🔔</span>${esc(t('notif.empty'))}</div>`;
      return;
    }
    listEl.innerHTML = items.map(n => `
      <div class="notif-item ${(!n.read && !plain) ? 'unread' : ''}">
        <span class="notif-ico" aria-hidden="true">${n.icon || '🔔'}</span>
        <div>
          <div class="notif-text">${esc(t(n.key, n.params))}</div>
          <div class="notif-time">${esc(timeAgo(n.createdAt))}</div>
        </div>
      </div>`).join('');
  },

  refreshBell(ring, skipPanel){
    const me = Auth.currentUser();
    const count = me ? this.unreadCount(me.id) : 0;
    document.querySelectorAll('.bell-wrap').forEach(wrap => {
      const badge = wrap.querySelector('.bell-badge');
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.toggle('hidden', count === 0);
      if(ring && count > 0){
        const btn = wrap.querySelector('.bell-btn');
        btn.classList.remove('ring'); void btn.offsetWidth; btn.classList.add('ring');
      }
      // Kung bukas ang panel habang may bagong dumating, i-update
      if(!skipPanel && wrap.classList.contains('open')) this.renderPanel(wrap);
    });
  }
};
