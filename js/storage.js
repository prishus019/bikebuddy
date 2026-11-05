/* ============================================================
   BikeBuddy — storage.js
   Simple localStorage "database" layer + seed data.
   Keys: bb_users, bb_bikes, bb_rentals, bb_session, bb_notifications
   ============================================================ */

const DB = {
  KEYS: { USERS: 'bb_users', BIKES: 'bb_bikes', RENTALS: 'bb_rentals', SESSION: 'bb_session', NOTIFS: 'bb_notifications' },

  read(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ console.error('Storage read failed', key, e); return null; }
  },
  write(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ console.error('Storage write failed', key, e); }
  },

  uid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); },

  getUsers(){ return this.read(this.KEYS.USERS) || []; },
  saveUsers(list){ this.write(this.KEYS.USERS, list); },

  getBikes(){ return this.read(this.KEYS.BIKES) || []; },
  saveBikes(list){ this.write(this.KEYS.BIKES, list); },

  getRentals(){ return this.read(this.KEYS.RENTALS) || []; },
  saveRentals(list){ this.write(this.KEYS.RENTALS, list); },

  getNotifs(){ return this.read(this.KEYS.NOTIFS) || []; },
  saveNotifs(list){ this.write(this.KEYS.NOTIFS, list); },

  getSession(){ return this.read(this.KEYS.SESSION); },
  setSession(session){ this.write(this.KEYS.SESSION, session); },
  clearSession(){ localStorage.removeItem(this.KEYS.SESSION); }
};

/* Simple placeholder bike photos, drawn as inline SVG data-URIs so the
   demo works fully offline with no external images. Admin can replace
   any of these with a real uploaded photo at any time. */
function placeholderBikeSVG(bg, accent){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'>
    <rect width='320' height='200' fill='${bg}'/>
    <circle cx='95' cy='140' r='38' fill='none' stroke='${accent}' stroke-width='8'/>
    <circle cx='225' cy='140' r='38' fill='none' stroke='${accent}' stroke-width='8'/>
    <path d='M95 140 L160 90 L225 140 M160 90 L178 140 M120 140 L200 140 M178 140 L198 75 L228 75' fill='none' stroke='${accent}' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/>
    <circle cx='198' cy='75' r='13' fill='${accent}'/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function seedIfEmpty(){
  // Demo accounts (idinadagdag lang kung wala pa)
  const users = DB.getUsers();
  const hasEmail = email => users.some(u => u.email.toLowerCase() === email);
  if(!hasEmail('admin@bikebuddy.ph')){
    users.push({
      id: DB.uid('u'), role:'admin', name:'BikeBuddy Staff',
      email:'admin@bikebuddy.ph', contact:'0917 000 0000', address:'BikeBuddy HQ, Quezon City',
      password:'admin123', createdAt: Date.now(),
      settings: { theme:'light', lang:'en' }
    });
  }
  if(!hasEmail('customer@bikebuddy.ph')){
    users.push({
      id: DB.uid('u'), role:'client', name:'Juan Dela Cruz',
      email:'customer@bikebuddy.ph', contact:'0918 123 4567', address:'Calapan City, Oriental Mindoro',
      password:'customer123', createdAt: Date.now(),
      settings: { theme:'light', lang:'en' }
    });
  }
  DB.saveUsers(users);
  if(DB.getBikes().length === 0){
    DB.saveBikes([
      { id: DB.uid('b'), name:'Trailblazer 03', type:'Mountain', pricePerHour:60, status:'Available', image: placeholderBikeSVG('#E7F5EF','#17835F') },
      { id: DB.uid('b'), name:'City Cruiser', type:'City', pricePerHour:40, status:'Available', image: placeholderBikeSVG('#FFF4DE','#E8A821') },
      { id: DB.uid('b'), name:'RoadRunner X', type:'Road', pricePerHour:70, status:'Unavailable', image: placeholderBikeSVG('#FFE9E5','#FF6B57') },
      { id: DB.uid('b'), name:'FoldEasy Mini', type:'Folding', pricePerHour:35, status:'Available', image: placeholderBikeSVG('#EAF1FF','#3B5BDB') },
      { id: DB.uid('b'), name:'VoltRide E1', type:'Electric', pricePerHour:90, status:'Available', image: placeholderBikeSVG('#F1EBFF','#7C4DFF') },
      { id: DB.uid('b'), name:'Commuter Lite', type:'City', pricePerHour:38, status:'Available', image: placeholderBikeSVG('#E7F5EF','#17835F') }
    ]);
  }
  if(DB.getRentals() === null || DB.read(DB.KEYS.RENTALS) === null){
    DB.saveRentals([]);
  }
  // Unang bukas ng notifications: bigyan ng welcome message ang bawat account
  if(DB.read(DB.KEYS.NOTIFS) === null){
    DB.saveNotifs(DB.getUsers().map(u => ({
      id: DB.uid('n'), userId: u.id,
      key: u.role === 'admin' ? 'n.welcomeAdmin' : 'n.welcome',
      params: {}, icon: '🎉', createdAt: Date.now(), read: false
    })));
  }
}
