/* ============================================================
   BikeBuddy — auth.js
   Login, registration, session handling, role routing.
   ============================================================ */

const Auth = {

  currentUser(){
    const session = DB.getSession();
    if(!session) return null;
    return DB.getUsers().find(u => u.id === session.userId) || null;
  },

  login(role, identifier, password){
    const users = DB.getUsers();
    const user = users.find(u =>
      u.role === role &&
      (u.email.toLowerCase() === identifier.toLowerCase()) &&
      u.password === password
    );
    if(!user) return { ok:false, message: t('msg.loginFail') };
    DB.setSession({ userId: user.id, role: user.role });
    return { ok:true, user };
  },

  register(data){
    const users = DB.getUsers();
    const exists = users.some(u => u.email.toLowerCase() === data.email.toLowerCase());
    if(exists) return { ok:false, message: t('msg.emailTaken') };
    const user = {
      id: DB.uid('u'), role:'client',
      name: data.name, email: data.email, contact: data.contact, address: data.address,
      password: data.password, createdAt: Date.now(),
      // Bawat account may sariling settings — hindi nakakaapekto sa iba
      settings: { theme:'light', lang:'en' }
    };
    users.push(user);
    DB.saveUsers(users);
    DB.setSession({ userId: user.id, role: 'client' });
    Notifs.push(user.id, 'n.welcome', {}, '🎉');
    Notifs.pushToAdmins('n.a.newUser', { user: user.name }, '🙋');
    return { ok:true, user };
  },

  logout(){
    DB.clearSession();
  }
};
