/* ============================================================
   BikeBuddy — admin.js
   Dashboard stats, bike CRUD (with photo upload), rentals, users.
   ============================================================ */

const Admin = {
  uploadedImage: null,

  init(){
    this.refreshAll();
    this.bindOnce();
  },

  bindOnce(){
    if(this._bound) return;
    this._bound = true;

    document.getElementById('btn-add-bike').addEventListener('click', () => this.openBikeModal());
    document.getElementById('form-bike').addEventListener('submit', e => this.onSaveBike(e));
    document.getElementById('form-bike').querySelector('[name="image"]').addEventListener('change', e => this.onImageChosen(e));
  },

  refreshAll(){
    this.renderDashboard();
    this.renderBikes();
    this.renderRentals();
    this.renderUsers();
  },

  /* ---------------- DASHBOARD ---------------- */
  renderDashboard(){
    const bikes = DB.getBikes();
    const rentals = DB.getRentals();
    const users = DB.getUsers().filter(u => u.role === 'client');
    document.getElementById('dash-total-bikes').textContent = bikes.length;
    document.getElementById('dash-available-bikes').textContent = bikes.filter(b => b.status === 'Available').length;
    document.getElementById('dash-active-rentals').textContent = rentals.filter(r => r.status === 'Active').length;
    document.getElementById('dash-total-users').textContent = users.length;
  },

  /* ---------------- MANAGE BIKES ---------------- */
  renderBikes(){
    const bikes = DB.getBikes();
    const tbody = document.querySelector('#table-bikes tbody');
    if(bikes.length === 0){
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:30px;">${esc(t('abikes.empty'))}</td></tr>`;
      return;
    }
    tbody.innerHTML = bikes.map(b => `
      <tr>
        <td><img class="table-thumb" src="${b.image}" alt="${esc(b.name)}"></td>
        <td>${esc(b.name)}</td>
        <td>${esc(t('type.' + b.type))}</td>
        <td>₱${b.pricePerHour}</td>
        <td><span class="badge ${esc(b.status)}">${esc(t('status.' + b.status))}</span></td>
        <td class="row-actions">
          <button class="icon-btn" title="${esc(t('title.edit'))}" aria-label="${esc(t('title.edit'))}" data-edit-bike="${b.id}">✏️</button>
          <button class="icon-btn" title="${esc(t('title.delete'))}" aria-label="${esc(t('title.delete'))}" data-delete-bike="${b.id}">🗑️</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit-bike]').forEach(btn => btn.addEventListener('click', () => this.openBikeModal(btn.dataset.editBike)));
    tbody.querySelectorAll('[data-delete-bike]').forEach(btn => btn.addEventListener('click', () => this.deleteBike(btn.dataset.deleteBike)));
  },

  openBikeModal(bikeId){
    const form = document.getElementById('form-bike');
    form.reset();
    this.uploadedImage = null;
    const preview = document.getElementById('bike-image-preview');
    preview.classList.add('hidden');

    if(bikeId){
      const bike = DB.getBikes().find(b => b.id === bikeId);
      document.getElementById('bike-modal-title').textContent = t('bike.edit');
      form.bikeId.value = bike.id;
      form.name.value = bike.name;
      form.type.value = bike.type;
      form.price.value = bike.pricePerHour;
      form.status.value = bike.status;
      this.uploadedImage = bike.image;
      preview.src = bike.image;
      preview.classList.remove('hidden');
    } else {
      document.getElementById('bike-modal-title').textContent = t('bike.add');
      form.bikeId.value = '';
    }
    App.openModal('modal-bike');
  },

  onImageChosen(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.uploadedImage = ev.target.result; // base64 data URI, stored directly in localStorage
      const preview = document.getElementById('bike-image-preview');
      preview.src = this.uploadedImage;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  },

  onSaveBike(e){
    e.preventDefault();
    const form = e.target;
    const bikes = DB.getBikes();
    const id = form.bikeId.value;
    const image = this.uploadedImage || placeholderBikeSVG('#ECEEE7', '#1B1F2A');

    if(id){
      const idx = bikes.findIndex(b => b.id === id);
      bikes[idx] = { ...bikes[idx], name: form.name.value.trim(), type: form.type.value, pricePerHour: Number(form.price.value), status: form.status.value, image };
    } else {
      bikes.push({ id: DB.uid('b'), name: form.name.value.trim(), type: form.type.value, pricePerHour: Number(form.price.value), status: form.status.value, image });
    }
    DB.saveBikes(bikes);
    App.closeModal('modal-bike');
    App.toast(id ? t('toast.bikeUpdated') : t('toast.bikeAdded'));
    this.refreshAll();
  },

  deleteBike(bikeId){
    const hasActiveRental = DB.getRentals().some(r => r.bikeId === bikeId && r.status === 'Active');
    if(hasActiveRental){ App.toast(t('toast.cannotDelete')); return; }
    if(!confirm(t('confirm.deleteBike'))) return;
    DB.saveBikes(DB.getBikes().filter(b => b.id !== bikeId));
    App.toast(t('toast.bikeDeleted'));
    this.refreshAll();
  },

  /* ---------------- MANAGE RENTALS ---------------- */
  renderRentals(){
    const rentals = DB.getRentals().sort((a,b) => b.createdAt - a.createdAt);
    const tbody = document.querySelector('#table-rentals tbody');
    if(rentals.length === 0){
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:30px;">${esc(t('arentals.empty'))}</td></tr>`;
      return;
    }
    const users = DB.getUsers();
    const bikes = DB.getBikes();
    tbody.innerHTML = rentals.map(r => {
      const user = users.find(u => u.id === r.userId);
      const bike = bikes.find(b => b.id === r.bikeId);
      return `<tr>
        <td>${esc(user ? user.name : t('deletedUser'))}</td>
        <td>${esc(bike ? bike.name : t('deletedBike'))}</td>
        <td>${esc(new Date(r.startTime).toLocaleString(I18n.locale()))}</td>
        <td>${r.durationHours}h</td>
        <td>${esc(t('method.' + r.paymentMethod))} · <span class="badge ${esc(r.paymentStatus)}">${esc(t('status.' + r.paymentStatus))}</span></td>
        <td><span class="badge ${esc(r.status)}">${esc(t('status.' + r.status))}</span></td>
        <td>${r.status === 'Active' ? `<button class="btn btn-sm btn-outline" data-mark-returned="${r.id}">${esc(t('btn.markReturned'))}</button>` : ''}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-mark-returned]').forEach(btn => {
      btn.addEventListener('click', () => {
        Client.returnBike(btn.dataset.markReturned, true);
        this.refreshAll();
      });
    });
  },

  /* ---------------- MANAGE USERS ---------------- */
  renderUsers(){
    const users = DB.getUsers().filter(u => u.role === 'client').sort((a,b) => b.createdAt - a.createdAt);
    const tbody = document.querySelector('#table-users tbody');
    if(users.length === 0){
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:30px;">${esc(t('ausers.empty'))}</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${esc(u.name)}</td>
        <td>${esc(u.email)}</td>
        <td>${esc(u.contact)}</td>
        <td>${esc(u.address)}</td>
        <td>${esc(new Date(u.createdAt).toLocaleDateString(I18n.locale()))}</td>
      </tr>`).join('');
  }
};
