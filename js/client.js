/* ============================================================
   BikeBuddy — client.js
   Home listing, rent flow, active rental countdown, history, profile.
   ============================================================ */

const Client = {
  rentTimer: null,
  pendingBikeId: null,

  init(){
    this.renderAll();
    this.bindOnce();
  },

  renderAll(){
    this.renderHome();
    this.renderRentals();
    this.renderHistory();
    this.fillProfile();
  },

  bindOnce(){
    if(this._bound) return;
    this._bound = true;

    document.getElementById('form-rent').addEventListener('submit', e => this.onConfirmRental(e));
    document.getElementById('form-profile').addEventListener('submit', e => this.onSaveProfile(e));

    document.querySelectorAll('#form-rent [name="payMethod"]').forEach(radio => {
      radio.addEventListener('change', () => this.toggleGcashBox());
    });
    document.getElementById('form-rent').querySelector('[name="duration"]').addEventListener('input', () => this.updateRentTotal());
  },

  stop(){ clearInterval(this.rentTimer); },

  toggleGcashBox(){
    const method = document.querySelector('#form-rent [name="payMethod"]:checked').value;
    document.getElementById('gcash-box').classList.toggle('hidden', method !== 'GCash');
  },

  /* ---------------- HOME / BIKE LISTING ---------------- */
  renderHome(){
    const bikes = DB.getBikes();
    document.getElementById('stat-bikes').textContent = bikes.length;
    document.getElementById('stat-available').textContent = bikes.filter(b => b.status === 'Available').length;

    const grid = document.getElementById('bike-grid');
    grid.innerHTML = '';
    if(bikes.length === 0){
      grid.innerHTML = `<div class="empty-state"><span class="emoji">🚲</span>${esc(t('home.empty'))}</div>`;
      return;
    }
    bikes.forEach(bike => {
      const el = document.createElement('div');
      el.className = 'bike-ticket';
      el.innerHTML = `
        <div class="bike-photo"><img src="${bike.image}" alt="${esc(bike.name)}"></div>
        <div class="bike-body">
          <h3 class="bike-name">${esc(bike.name)}</h3>
          <span class="bike-type">${esc(t('type.' + bike.type))}</span>
          <span class="bike-status ${esc(bike.status)}">${esc(t('status.' + bike.status))}</span>
        </div>
        <div class="ticket-perf"></div>
        <div class="bike-footer">
          <div class="bike-price">₱${bike.pricePerHour}<span> ${esc(t('perHour'))}</span></div>
          <button class="btn btn-primary btn-sm" ${bike.status !== 'Available' ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''} data-rent-bike="${bike.id}">${esc(t('btn.rentThis'))}</button>
        </div>`;
      grid.appendChild(el);
    });

    grid.querySelectorAll('[data-rent-bike]').forEach(btn => {
      btn.addEventListener('click', () => this.openRentModal(btn.dataset.rentBike));
    });
  },

  openRentModal(bikeId){
    const bike = DB.getBikes().find(b => b.id === bikeId);
    if(!bike || bike.status !== 'Available') return;
    this.pendingBikeId = bikeId;

    document.getElementById('rent-summary').innerHTML = `
      <img src="${bike.image}" alt="${esc(bike.name)}">
      <div><strong>${esc(bike.name)}</strong><br><span class="muted">${esc(t('type.' + bike.type))} · ₱${bike.pricePerHour}${esc(t('perHour'))}</span></div>`;

    const form = document.getElementById('form-rent');
    form.reset();
    const now = new Date(Date.now() - Date.now() % 60000);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    form.startTime.value = now.toISOString().slice(0,16);
    this.toggleGcashBox();
    this.updateRentTotal();
    App.openModal('modal-rent');
  },

  updateRentTotal(){
    const bike = DB.getBikes().find(b => b.id === this.pendingBikeId);
    const hours = Number(document.getElementById('form-rent').duration.value) || 0;
    const total = bike ? bike.pricePerHour * hours : 0;
    document.getElementById('rent-total').textContent = '₱' + total;
  },

  onConfirmRental(e){
    e.preventDefault();
    const form = e.target;
    const bike = DB.getBikes().find(b => b.id === this.pendingBikeId);
    const user = Auth.currentUser();
    if(!bike || !user){ App.toast(t('toast.error')); return; }

    const duration = Number(form.duration.value);
    const payMethod = form.payMethod.value;
    const reference = form.reference.value.trim();
    if(payMethod === 'GCash' && !reference){
      App.toast(t('toast.needRef'));
      return;
    }

    const startTime = new Date(form.startTime.value).getTime();
    const totalCost = bike.pricePerHour * duration;
    const rentals = DB.getRentals();
    rentals.push({
      id: DB.uid('r'),
      userId: user.id,
      bikeId: bike.id,
      startTime, durationHours: duration,
      status: 'Active',
      paymentMethod: payMethod,
      paymentStatus: payMethod === 'GCash' ? 'Paid' : 'Pending',
      referenceNo: payMethod === 'GCash' ? reference : '',
      totalCost,
      actualReturnTime: null,
      createdAt: Date.now(),
      soonNotified: false, overdueNotified: false
    });
    DB.saveRentals(rentals);

    const bikes = DB.getBikes();
    const idx = bikes.findIndex(b => b.id === bike.id);
    bikes[idx].status = 'Unavailable';
    DB.saveBikes(bikes);

    Notifs.push(user.id, 'n.rentalConfirmed', { bike: bike.name, hours: duration, total: totalCost }, '✅');
    Notifs.pushToAdmins('n.a.newRental', { user: user.name, bike: bike.name, hours: duration, method: t('method.' + payMethod) }, '🛎️');

    App.closeModal('modal-rent');
    App.toast(t('toast.confirmed', { bike: bike.name }));
    this.renderHome();
    this.renderRentals();
    App.switchPanel('client', 'client-rentals');
    Notifs.checkRentals();
  },

  /* ---------------- ACTIVE RENTAL ---------------- */
  renderRentals(){
    const user = Auth.currentUser();
    const area = document.getElementById('active-rental-area');
    if(!user){ return; }
    const rentals = DB.getRentals().filter(r => r.userId === user.id && r.status === 'Active');

    clearInterval(this.rentTimer);

    if(rentals.length === 0){
      area.innerHTML = `<div class="empty-state"><span class="emoji">🅿️</span>${esc(t('rental.empty'))}</div>`;
      return;
    }

    const renderCards = () => {
      area.innerHTML = rentals.map(r => {
        const bike = DB.getBikes().find(b => b.id === r.bikeId) || {};
        const endExpected = r.startTime + r.durationHours * 3600000;
        const msLeft = endExpected - Date.now();
        const overdue = msLeft < 0;
        const abs = Math.abs(msLeft);
        const h = Math.floor(abs / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        const timeLabel = overdue ? t('rental.overdue', { h, m }) : t('rental.left', { h, m });
        return `
        <div class="rental-card">
          <img src="${bike.image || ''}" alt="${esc(bike.name || '')}">
          <div class="rental-info">
            <h4>${esc(bike.name || 'Bike')}</h4>
            <div class="rental-meta">
              <span>${esc(t('rental.started'))} ${esc(new Date(r.startTime).toLocaleString(I18n.locale()))}</span>
              <span>${esc(t('rental.duration', { h: r.durationHours }))}</span>
              <span>${esc(t('method.' + r.paymentMethod))} · <span class="badge ${esc(r.paymentStatus)}">${esc(t('status.' + r.paymentStatus))}</span></span>
            </div>
            <div class="rental-meta"><span class="time-left ${overdue ? 'overdue' : ''}">${esc(timeLabel)}</span></div>
          </div>
          <button class="btn btn-primary" data-return-rental="${r.id}">${esc(t('btn.returnBike'))}</button>
        </div>`;
      }).join('');

      area.querySelectorAll('[data-return-rental]').forEach(btn => {
        btn.addEventListener('click', () => this.returnBike(btn.dataset.returnRental));
      });
    };

    renderCards();
    this.rentTimer = setInterval(renderCards, 30000);
  },

  /* byAdmin = true kapag staff ang nag-mark na naisauli */
  returnBike(rentalId, byAdmin){
    const rentals = DB.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if(idx === -1) return;
    const r = rentals[idx];
    r.status = 'Returned';
    r.actualReturnTime = Date.now();
    const wasCash = r.paymentMethod === 'Cash';
    if(wasCash) r.paymentStatus = 'Paid';
    DB.saveRentals(rentals);

    const bikes = DB.getBikes();
    const bIdx = bikes.findIndex(b => b.id === r.bikeId);
    if(bIdx !== -1){ bikes[bIdx].status = 'Available'; DB.saveBikes(bikes); }

    const bikeName = bIdx !== -1 ? bikes[bIdx].name : '—';
    const rider = DB.getUsers().find(u => u.id === r.userId);
    if(byAdmin){
      Notifs.push(r.userId, wasCash ? 'n.returnedByStaffCash' : 'n.returnedByStaff', { bike: bikeName, total: r.totalCost }, '🚲');
    } else {
      Notifs.push(r.userId, wasCash ? 'n.returnedCash' : 'n.returned', { bike: bikeName, total: r.totalCost }, '🚲');
      Notifs.pushToAdmins('n.a.returned', { user: rider ? rider.name : '—', bike: bikeName }, '🚲');
    }

    App.toast(t('toast.returned'));
    this.renderHome();
    this.renderRentals();
    this.renderHistory();
  },

  /* ---------------- HISTORY ---------------- */
  renderHistory(){
    const user = Auth.currentUser();
    const area = document.getElementById('history-area');
    if(!user) return;
    const rentals = DB.getRentals()
      .filter(r => r.userId === user.id && r.status === 'Returned')
      .sort((a,b) => b.actualReturnTime - a.actualReturnTime);

    if(rentals.length === 0){
      area.innerHTML = `<div class="empty-state"><span class="emoji">📜</span>${esc(t('history.empty'))}</div>`;
      return;
    }
    area.innerHTML = rentals.map(r => {
      const bike = DB.getBikes().find(b => b.id === r.bikeId) || {};
      return `<div class="history-row">
        <div class="h-left"><strong>${esc(bike.name || 'Bike')}</strong><span>${esc(new Date(r.startTime).toLocaleDateString(I18n.locale()))} · ${r.durationHours}h · ${esc(t('method.' + r.paymentMethod))}</span></div>
        <div class="h-cost">₱${r.totalCost}</div>
      </div>`;
    }).join('');
  },

  /* ---------------- PROFILE ---------------- */
  fillProfile(){
    const user = Auth.currentUser();
    if(!user) return;
    const form = document.getElementById('form-profile');
    form.name.value = user.name;
    form.contact.value = user.contact;
    form.address.value = user.address;
    form.password.value = '';
  },

  onSaveProfile(e){
    e.preventDefault();
    const form = e.target;
    const users = DB.getUsers();
    const me = Auth.currentUser();
    const idx = me ? users.findIndex(u => u.id === me.id) : -1;
    if(idx === -1) return;
    users[idx].name = form.name.value.trim();
    users[idx].contact = form.contact.value.trim();
    users[idx].address = form.address.value.trim();
    if(form.password.value.trim()) users[idx].password = form.password.value.trim();
    DB.saveUsers(users);
    form.password.value = '';
    App.toast(t('toast.profileUpdated'));
  }
};
