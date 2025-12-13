/* ========================================
   LUMINOS MC - SCRIPT.JS CON PERSISTENT STORAGE
   ======================================== */

let currentUser = null;
let currentAdmin = null;
let editingId = null;
let isRegistering = false;

// Permessi disponibili
const AVAILABLE_PERMISSIONS = [
  { id: 'manage_posts', label: 'Gestire Post' },
  { id: 'manage_staff', label: 'Gestire Staff' },
  { id: 'manage_products', label: 'Gestire Prodotti' },
  { id: 'manage_roles', label: 'Gestire Ruoli' },
  { id: 'view_admin', label: 'Accesso Admin' },
  { id: 'delete_any_post', label: 'Eliminare Qualsiasi Post' },
  { id: 'edit_any_post', label: 'Modificare Qualsiasi Post' },
  { id: 'manage_users', label: 'Gestire Database Utenti' }
];

/* ========================================
   PERSISTENT STORAGE FUNCTIONS (localStorage)
   ======================================== */

async function saveData(key, data, shared = true) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Errore nel salvare i dati:', error);
    return false;
  }
}

async function loadData(key, defaultValue = null, shared = true) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error('Errore nel caricare i dati:', error);
    return defaultValue;
  }
}

async function deleteData(key, shared = true) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Errore nell\'eliminare i dati:', error);
    return false;
  }
}

async function saveSession(user) {
  try {
    localStorage.setItem('current_session', JSON.stringify(user));
  } catch (error) {
    console.error('Errore nel salvare la sessione:', error);
  }
}

async function loadSession() {
  try {
    const value = localStorage.getItem('current_session');
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Errore nel caricare la sessione:', error);
    return null;
  }
}

async function clearSession() {
  try {
    localStorage.removeItem('current_session');
  } catch (error) {
    console.error('Errore nell\'eliminare la sessione:', error);
  }
}

/* ========================================
   INITIALIZATION
   ======================================== */

async function loadAllData() {
  // I dati vengono caricati dinamicamente quando servono
}

document.addEventListener('DOMContentLoaded', async function() {
  await initializeSystem();
  await restoreSession();
  await loadAllData();
  await renderStore();
  if (currentUser) {
    await renderPosts();
    await renderAllPosts();
  }
  await updateStats();
});

async function initializeSystem() {
  console.log('🔄 Inizializzazione sistema...');
  
  // Inizializza owner solo se non esistono admin users
  const adminUsers = await loadData('admin_users', []);
  console.log('📊 Admin users trovati:', adminUsers.length);
  
  if (adminUsers.length === 0) {
    // Crea un admin owner di default per il primo accesso
    const defaultOwner = {
      id: 'admin_owner',
      username: 'admin',
      password: 'admin',
      roles: ['owner'],
      created: new Date().toISOString().split('T')[0]
    };
    
    const success = await saveData('admin_users', [defaultOwner]);
    console.log('✅ Account Owner creato:', success);
    
    // Verifica che sia stato salvato
    const verify = await loadData('admin_users', []);
    console.log('🔍 Verifica admin salvato:', verify);
    
    showAlert('SETUP INIZIALE: Account Owner creato! Username: admin | Password: admin', 'success');
  } else {
    console.log('ℹ️ Admin users già presenti:', adminUsers);
  }

  // Inizializza ruoli se non esistono
  const roles = await loadData('roles', []);
  console.log('📊 Ruoli trovati:', roles.length);
  
  if (roles.length === 0) {
    const defaultRoles = [
      {
        id: 'owner',
        name: 'Owner',
        color: 'owner',
        permissions: ['manage_posts', 'manage_staff', 'manage_products', 'manage_roles', 'view_admin', 'delete_any_post', 'edit_any_post', 'manage_users'],
        system: true
      },
      {
        id: 'admin',
        name: 'Admin',
        color: 'admin',
        permissions: ['manage_posts', 'manage_staff', 'view_admin', 'delete_any_post', 'edit_any_post', 'manage_users'],
        system: false
      },
      {
        id: 'moderator',
        name: 'Moderatore',
        color: 'moderator',
        permissions: ['manage_posts', 'view_admin', 'delete_any_post'],
        system: false
      },
      {
        id: 'helper',
        name: 'Helper',
        color: 'helper',
        permissions: ['view_admin'],
        system: false
      }
    ];
    await saveData('roles', defaultRoles);
    console.log('✅ Ruoli creati');
  }

  // Inizializza prodotti se non esistono
  const products = await loadData('products', []);
  console.log('📊 Prodotti trovati:', products.length);
  
  if (products.length === 0) {
    const defaultProducts = [
      {
        id: 'prod_1',
        name: "VIP Bronze",
        price: 4.99,
        features: ["Prefix dedicato", "Kit giornaliero", "Queue prioritaria"],
        featured: false
      },
      {
        id: 'prod_2',
        name: "VIP Silver",
        price: 9.99,
        features: ["Tutto di Bronze", "Particles esclusive", "/hat e /nick"],
        featured: false
      },
      {
        id: 'prod_3',
        name: "VIP Gold",
        price: 14.99,
        features: ["Tutto di Silver", "Kit potenziato Lifesteal", "Slot riservato"],
        featured: true
      },
      {
        id: 'prod_4',
        name: "VIP Legend",
        price: 24.99,
        features: ["Tutto di Gold", "Emote custom", "Ricompense evento +"],
        featured: false
      }
    ];
    await saveData('products', defaultProducts);
    console.log('✅ Prodotti creati');
  }
  
  console.log('✅ Inizializzazione completata');
}

/* ========================================
   SESSION MANAGEMENT
   ======================================== */

async function restoreSession() {
  const session = await loadSession();
  
  if (session) {
    if (session.isAdmin) {
      // Verifica che l'admin esista ancora nel database
      const adminUsers = await loadData('admin_users', []);
      const admin = adminUsers.find(u => u.id === session.id);
      
      if (admin) {
        currentAdmin = admin;
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        await renderAdminContent();
      } else {
        await clearSession();
      }
    } else {
      // Verifica che l'utente esista ancora nel database
      const users = await loadData('forum_users', []);
      const user = users.find(u => u.id === session.id);
      
      if (user) {
        currentUser = user;
        updateUserInfo();
        document.getElementById('forumCreatePost').style.display = 'block';
        document.getElementById('userPostsCard').style.display = 'block';
        
        // Resta sulla pagina corrente se era nel forum o admin
        const currentPage = document.querySelector('.page.active');
        if (currentPage && (currentPage.id === 'forum' || currentPage.id === 'admin')) {
          await renderPosts();
          await renderAllPosts();
        }
      } else {
        await clearSession();
      }
    }
  }
  
  checkAuth();
}

/* ========================================
   ADMIN AUTHENTICATION
   ======================================== */

async function handleAdminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  console.log('🔐 Tentativo login admin:', username);

  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const adminUsers = await loadData('admin_users', []);
  console.log('👥 Admin users nel database:', adminUsers);
  console.log('🔍 Cerco:', { username, password });
  
  const admin = adminUsers.find(u => {
    console.log('Confronto con:', u.username, u.password);
    return u.username === username && u.password === password;
  });

  if (admin) {
    console.log('✅ Admin trovato:', admin);
    currentAdmin = { ...admin };
    await saveSession({ ...admin, isAdmin: true });
    showAlert('Accesso admin effettuato!', 'success');
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    await renderAdminContent();
  } else {
    console.log('❌ Admin non trovato');
    showAlert(`Credenziali admin errate! (Database ha ${adminUsers.length} admin)`, 'error');
  }
}

async function logoutAdmin() {
  currentAdmin = null;
  await clearSession();
  document.getElementById('adminLoginSection').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminUsername').value = '';
  document.getElementById('adminPassword').value = '';
  showAlert('Logout admin effettuato!', 'success');
}

async function checkAdminPermission(permission) {
  if (!currentAdmin) {
    return false;
  }
  
  const roles = await loadData('roles', []);
  const adminRoles = roles.filter(r => currentAdmin.roles.includes(r.id));
  
  return adminRoles.some(role => role.permissions.includes(permission));
}

/* ========================================
   AUTHENTICATION
   ======================================== */

function switchToRegister() {
  isRegistering = !isRegistering;
  const title = document.getElementById('loginTitle');
  const hint = document.getElementById('loginHint');
  const button = document.getElementById('loginBtn');
  
  if (isRegistering) {
    title.textContent = '📝 Registrazione';
    hint.innerHTML = 'Hai già un account? <a onclick="switchToRegister()">Accedi</a><br>oppure <a onclick="showPage(\'home\')">torna alla home</a>';
    button.textContent = 'Registrati';
    button.onclick = handleRegister;
  } else {
    title.textContent = '🔐 Login';
    hint.innerHTML = 'Non hai un account? <a onclick="switchToRegister()">Registrati</a><br>oppure <a onclick="showPage(\'home\')">torna alla home</a>';
    button.textContent = 'Accedi';
    button.onclick = handleLogin;
  }
}

async function handleRegister() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  if (username.length < 3) {
    showAlert('Username troppo corto (minimo 3 caratteri)!', 'error');
    return;
  }

  if (password.length < 4) {
    showAlert('Password troppo corta (minimo 4 caratteri)!', 'error');
    return;
  }

  const users = await loadData('forum_users', []);
  
  // Controlla se l'username esiste già
  if (users.find(u => u.username === username)) {
    showAlert('Username già esistente!', 'error');
    return;
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username: username,
    password: password,
    created: new Date().toISOString().split('T')[0]
  };

  users.push(newUser);
  await saveData('forum_users', users);
  
  showAlert('Registrazione completata! Ora puoi accedere.', 'success');
  
  // Torna al form di login
  switchToRegister();
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = '';
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const users = await loadData('forum_users', []);
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    currentUser = { ...user };
    await saveSession({ ...user, isAdmin: false });
    showAlert('Login effettuato con successo!', 'success');
    updateUserInfo();
    showPage('home');
    
    // Mostra sezioni del forum per utenti loggati
    document.getElementById('forumCreatePost').style.display = 'block';
    document.getElementById('userPostsCard').style.display = 'block';
    
    // Pulisci i campi
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  } else {
    showAlert('Credenziali errate!', 'error');
  }
}

async function logout() {
  currentUser = null;
  await clearSession();
  updateUserInfo();
  showPage('home');
  showAlert('Logout effettuato con successo!', 'success');
  
  // Nascondi sezioni del forum
  document.getElementById('forumCreatePost').style.display = 'none';
  document.getElementById('userPostsCard').style.display = 'none';
}

function checkAuth() {
  updateUserInfo();
}

async function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  const rolesBtn = document.getElementById('rolesBtn');
  
  if (currentUser) {
    const roles = await loadData('roles', []);
    const userRoles = currentUser.roles ? roles.filter(r => currentUser.roles.includes(r.id)) : [];
    const rolesHTML = userRoles.map(r => `<span class="role-badge role-${r.color}">${r.name}</span>`).join('');
    
    userInfo.innerHTML = `
      <span>👤 ${currentUser.username}</span>
      ${rolesHTML}
      <button class="btn-logout" onclick="logout()">Esci</button>
    `;
    
    // Mostra gestione ruoli solo se è owner
    if (await hasPermission('manage_roles')) {
      if (rolesBtn) rolesBtn.style.display = 'inline-block';
    } else {
      if (rolesBtn) rolesBtn.style.display = 'none';
    }
  } else {
    userInfo.innerHTML = '';
    if (rolesBtn) rolesBtn.style.display = 'none';
  }
}

async function hasPermission(permission) {
  if (!currentUser || !currentUser.roles) return false;
  
  const roles = await loadData('roles', []);
  const userRoles = roles.filter(r => currentUser.roles.includes(r.id));
  
  return userRoles.some(role => role.permissions.includes(permission));
}

async function requirePermission(permission) {
  if (!currentUser) {
    showAlert('Devi essere loggato!', 'error');
    showPage('login');
    return false;
  }
  
  if (!await hasPermission(permission)) {
    showAlert('Non hai i permessi per questa azione!', 'error');
    return false;
  }
  
  return true;
}

/* ========================================
   PAGE NAVIGATION
   ======================================== */

async function showPage(pageName) {
  // Controllo accesso forum (richiede login)
  if (pageName === 'forum' && !currentUser) {
    showAlert('Devi essere registrato per accedere al forum!', 'error');
    showPage('login');
    return;
  }
  
  // Admin sempre accessibile, ma mostra login
  if (pageName === 'admin') {
    document.getElementById('adminLoginSection').style.display = currentAdmin ? 'none' : 'block';
    document.getElementById('adminPanel').style.display = currentAdmin ? 'block' : 'none';
  }
  
  // Controllo accesso ruoli
  if (pageName === 'roles' && !await hasPermission('manage_roles')) {
    showAlert('Accesso negato! Solo gli owner possono gestire i ruoli.', 'error');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const page = document.getElementById(pageName);
  if (page) {
    page.classList.add('active');
  }
  
  const navBtn = document.querySelector(`[data-page="${pageName}"]`);
  if (navBtn) {
    navBtn.classList.add('active');
  }
  
  if (pageName === 'forum') {
    await renderPosts();
    await renderAllPosts();
  }
  if (pageName === 'store') {
    await renderStore();
  }
  if (pageName === 'admin' && currentAdmin) {
    await renderAdminContent();
  }
  if (pageName === 'roles') {
    await renderRolesManagement();
  }
}

/* ========================================
   ADMIN TABS
   ======================================== */

async function showAdminTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
  
  const tab = document.getElementById(tabName);
  if (tab) {
    tab.classList.add('active');
  }
  
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) {
    btn.classList.add('active');
  }

  await renderAdminContent();
}

async function renderAdminContent() {
  await renderAdminPosts();
  await renderStaffList();
  await renderProductsList();
  await renderUsersList();
  await updateStats();
  await populateRoleSelects();
}

/* ========================================
   ALERT SYSTEM
   ======================================== */

function showAlert(message, type = 'success') {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert alert-${type} active`;
  setTimeout(() => alert.classList.remove('active'), 4000);
}

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

function copyIP() {
  navigator.clipboard.writeText("play.luminosmc.it");
  showAlert("IP copiato negli appunti!", 'success');
}

async function updateStats() {
  const posts = await loadData('posts', []);
  const users = await loadData('forum_users', []);
  const adminUsers = await loadData('admin_users', []);
  const staff = adminUsers.filter(u => u.roles && u.roles.length > 0);
  const products = await loadData('products', []);
  
  const totalPostsEl = document.getElementById('totalPosts');
  const totalUsersEl = document.getElementById('totalUsers');
  const totalStaffEl = document.getElementById('totalStaff');
  const totalProductsEl = document.getElementById('totalProducts');
  
  if (totalPostsEl) totalPostsEl.textContent = posts.length;
  if (totalUsersEl) totalUsersEl.textContent = users.length;
  if (totalStaffEl) totalStaffEl.textContent = staff.length;
  if (totalProductsEl) totalProductsEl.textContent = products.length;
}

// Export dati per admin
async function exportData() {
  if (!currentAdmin) {
    showAlert('Devi essere loggato come admin!', 'error');
    return;
  }

  const data = {
    posts: await loadData('posts', []),
    forum_users: await loadData('forum_users', []),
    admin_users: await loadData('admin_users', []),
    products: await loadData('products', []),
    roles: await loadData('roles', []),
    exported_at: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `luminosmc_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showAlert('Dati esportati con successo!', 'success');
}

// Funzione per resettare tutti i dati (SOLO PER DEBUG)
async function resetAllData() {
  if (confirm('⚠️ ATTENZIONE! Questo cancellerà TUTTI i dati (admin, utenti, post, prodotti). Continuare?')) {
    if (confirm('Sei DAVVERO sicuro? Questa azione è irreversibile!')) {
      try {
        await deleteData('admin_users');
        await deleteData('forum_users');
        await deleteData('posts');
        await deleteData('products');
        await deleteData('roles');
        await clearSession();
        
        showAlert('Tutti i dati sono stati cancellati! Ricarica la pagina.', 'success');
        
        setTimeout(() => {
          location.reload();
        }, 2000);
      } catch (error) {
        console.error('Errore nel reset:', error);
        showAlert('Errore durante il reset dei dati!', 'error');
      }
    }
  }
}

// Funzione per creare manualmente l'admin di default
async function createDefaultAdmin() {
  console.log('🔧 Creazione manuale admin...');
  
  const defaultOwner = {
    id: 'admin_owner',
    username: 'admin',
    password: 'admin',
    roles: ['owner'],
    created: new Date().toISOString().split('T')[0]
  };
  
  const adminUsers = await loadData('admin_users', []);
  console.log('📊 Admin attuali:', adminUsers);
  
  // Controlla se esiste già
  if (adminUsers.find(u => u.username === 'admin')) {
    showAlert('Account admin già esistente!', 'error');
    console.log('⚠️ Admin già presente nel database');
    return;
  }
  
  adminUsers.push(defaultOwner);
  const success = await saveData('admin_users', adminUsers);
  console.log('💾 Salvataggio risultato:', success);
  
  // Verifica immediata
  const verify = await loadData('admin_users', []);
  console.log('🔍 Verifica dopo salvataggio:', verify);
  
  showAlert('Account admin creato! Username: admin | Password: admin', 'success');
}

/* ========================================
   POSTS MANAGEMENT
   ======================================== */

async function createPost() {
  if (!currentUser) {
    showAlert('Devi essere loggato per creare un post!', 'error');
    return;
  }
  
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  
  if (!title || !content) {
    showAlert("Compila tutti i campi!", 'error');
    return;
  }

  if (title.length < 5) {
    showAlert("Il titolo deve essere di almeno 5 caratteri!", 'error');
    return;
  }

  if (content.length < 10) {
    showAlert("Il contenuto deve essere di almeno 10 caratteri!", 'error');
    return;
  }
  
  const posts = await loadData('posts', []);
  
  const newPost = {
    id: 'post_' + Date.now(),
    title: title,
    content: content,
    author: currentUser.username,
    date: new Date().toISOString().split('T')[0],
    replies: []
  };
  
  posts.push(newPost);
  await saveData('posts', posts);
  
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  await renderPosts();
  await renderAllPosts();
  showAlert("Post pubblicato con successo!", 'success');
}

async function renderPosts() {
  const userPostsList = document.getElementById('userPostsList');
  
  if (!userPostsList || !currentUser) return;
  
  const posts = await loadData('posts', []);
  const userPosts = posts.filter(p => p.author === currentUser.username);
  
  if (userPosts.length === 0) {
    userPostsList.innerHTML = '<p style="color: #8899aa;">Non hai ancora pubblicato nessun post.</p>';
    return;
  }
  
  userPostsList.innerHTML = userPosts.map(post => `
    <div class="post">
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.content)}</p>
      <div class="post-meta">Data: ${post.date} | Risposte: ${post.replies.length}</div>
      ${post.replies.length > 0 ? `
        <div class="post-replies">
          <strong>Risposte (${post.replies.length}):</strong>
          ${post.replies.map(reply => `
            <div class="reply">
              <p>${escapeHtml(reply.content)}</p>
              <div class="reply-meta">Da: ${escapeHtml(reply.author)} | ${reply.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="post-actions">
        <button class="btn btn-warning" onclick="editUserPost('${post.id}')">✏️ Modifica</button>
        <button class="btn btn-danger" onclick="deleteUserPost('${post.id}')">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

async function renderAllPosts() {
  const allPostsList = document.getElementById('allPostsList');
  
  if (!allPostsList) return;
  
  const posts = await loadData('posts', []);
  const searchQuery = document.getElementById('searchPosts')?.value.toLowerCase() || '';
  
  let filteredPosts = posts;
  if (searchQuery) {
    filteredPosts = posts.filter(post => 
      post.title.toLowerCase().includes(searchQuery) ||
      post.content.toLowerCase().includes(searchQuery) ||
      post.author.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredPosts.length === 0) {
    allPostsList.innerHTML = '<p style="color: #8899aa;">Nessun post trovato.</p>';
    return;
  }
  
  allPostsList.innerHTML = filteredPosts.map(post => `
    <div class="post">
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.content)}</p>
      <div class="post-meta">Autore: ${escapeHtml(post.author)} | Data: ${post.date} | Risposte: ${post.replies.length}</div>
      ${post.replies.length > 0 ? `
        <div class="post-replies">
          <strong>Risposte (${post.replies.length}):</strong>
          ${post.replies.map(reply => `
            <div class="reply">
              <p>${escapeHtml(reply.content)}</p>
              <div class="reply-meta">Da: ${escapeHtml(reply.author)} | ${reply.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function editUserPost(id) {
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === id);
  
  if (!post || post.author !== currentUser?.username) {
    if (!await hasPermission('edit_any_post')) {
      showAlert("Non puoi modificare questo post!", 'error');
      return;
    }
  }
  
  editingId = id;
  document.getElementById('editPostTitle').value = post.title;
  document.getElementById('editPostContent').value = post.content;
  openModal('editPostModal');
}

async function deleteUserPost(id) {
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === id);
  
  if (!post || post.author !== currentUser?.username) {
    if (!await hasPermission('delete_any_post')) {
      showAlert("Non puoi eliminare questo post!", 'error');
      return;
    }
  }
  
  if (confirm("Sei sicuro di voler eliminare questo post?")) {
    const updatedPosts = posts.filter(p => p.id !== id);
    await saveData('posts', updatedPosts);
    await renderPosts();
    await renderAllPosts();
    await updateStats();
    showAlert("Post eliminato con successo!", 'success');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ========================================
   ADMIN POSTS MANAGEMENT
   ======================================== */

async function refreshAdminPosts() {
  await renderAdminPosts();
  showAlert('Lista post aggiornata!', 'success');
}

async function renderAdminPosts() {
  const adminPostsList = document.getElementById('adminPostsList');
  
  if (!adminPostsList) return;
  
  const posts = await loadData('posts', []);
  const searchQuery = document.getElementById('adminSearchPosts')?.value.toLowerCase() || '';
  
  // Filtra i post in base alla ricerca
  let filteredPosts = posts;
  if (searchQuery) {
    filteredPosts = posts.filter(post => 
      post.title.toLowerCase().includes(searchQuery) ||
      post.content.toLowerCase().includes(searchQuery) ||
      post.author.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredPosts.length === 0) {
    adminPostsList.innerHTML = '<p style="color: #8899aa;">Nessun post trovato.</p>';
    return;
  }
  
  const canEdit = await checkAdminPermission('edit_any_post');
  const canDelete = await checkAdminPermission('delete_any_post');
  
  adminPostsList.innerHTML = filteredPosts.map(post => `
    <div class="post">
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.content)}</p>
      <div class="post-meta">Autore: ${escapeHtml(post.author)} | Data: ${post.date} | Risposte: ${post.replies.length}</div>
      ${post.replies.length > 0 ? `
        <div class="post-replies">
          <strong>Risposte (${post.replies.length}):</strong>
          ${post.replies.map(reply => `
            <div class="reply">
              <p>${escapeHtml(reply.content)}</p>
              <div class="reply-meta">Da: ${escapeHtml(reply.author)} | ${reply.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="post-actions">
        <button class="btn btn-success" onclick="replyToPost('${post.id}')">💬 Rispondi</button>
        ${canEdit ? `<button class="btn btn-warning" onclick="editAdminPost('${post.id}')">✏️ Modifica</button>` : ''}
        ${canDelete ? `<button class="btn btn-danger" onclick="deleteAdminPost('${post.id}')">🗑️ Elimina</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function editAdminPost(id) {
  if (!await checkAdminPermission('edit_any_post')) {
    showAlert('Non hai i permessi per modificare i post!', 'error');
    return;
  }
  
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  
  editingId = id;
  document.getElementById('editPostTitle').value = post.title;
  document.getElementById('editPostContent').value = post.content;
  openModal('editPostModal');
}

async function deleteAdminPost(id) {
  if (!await checkAdminPermission('delete_any_post')) {
    showAlert('Non hai i permessi per eliminare i post!', 'error');
    return;
  }
  
  if (confirm("Sei sicuro di voler eliminare questo post?")) {
    const posts = await loadData('posts', []);
    const updatedPosts = posts.filter(p => p.id !== id);
    await saveData('posts', updatedPosts);
    await renderAdminPosts();
    await updateStats();
    showAlert("Post eliminato con successo!", 'success');
  }
}

async function saveEditPost() {
  const title = document.getElementById('editPostTitle').value.trim();
  const content = document.getElementById('editPostContent').value.trim();
  
  if (!title || !content) {
    showAlert("Compila tutti i campi!", 'error');
    return;
  }
  
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === editingId);
  
  if (post) {
    post.title = title;
    post.content = content;
    await saveData('posts', posts);
    await renderPosts();
    await renderAllPosts();
    await renderAdminPosts();
    closeModal('editPostModal');
    showAlert("Post modificato con successo!", 'success');
  }
}

async function replyToPost(id) {
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  
  editingId = id;
  document.getElementById('replyPostPreview').innerHTML = `
    <h4>${escapeHtml(post.title)}</h4>
    <p>${escapeHtml(post.content)}</p>
    <div class="reply-meta">Da: ${escapeHtml(post.author)} | ${post.date}</div>
  `;
  document.getElementById('replyContent').value = '';
  openModal('replyPostModal');
}

async function saveReply() {
  const content = document.getElementById('replyContent').value.trim();
  
  if (!content) {
    showAlert("Scrivi una risposta!", 'error');
    return;
  }

  if (content.length < 3) {
    showAlert("La risposta deve essere di almeno 3 caratteri!", 'error');
    return;
  }
  
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === editingId);
  
  if (post) {
    const author = currentUser ? currentUser.username : (currentAdmin ? currentAdmin.username : 'Admin');
    const reply = {
      content: content,
      author: author,
      date: new Date().toISOString().split('T')[0]
    };
    post.replies.push(reply);
    await saveData('posts', posts);
    await renderPosts();
    await renderAllPosts();
    await renderAdminPosts();
    closeModal('replyPostModal');
    showAlert("Risposta inviata con successo!", 'success');
  }
}

/* ========================================
   USERS DATABASE MANAGEMENT
   ======================================== */

async function renderUsersList() {
  const usersList = document.getElementById('usersList');
  
  if (!usersList) return;
  
  const users = await loadData('forum_users', []);
  const searchQuery = document.getElementById('adminSearchUsers')?.value.toLowerCase() || '';
  
  let filteredUsers = users;
  if (searchQuery) {
    filteredUsers = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredUsers.length === 0) {
    usersList.innerHTML = '<p style="color: #8899aa;">Nessun utente trovato.</p>';
    return;
  }
  
  usersList.innerHTML = filteredUsers.map(user => `
    <div class="list-item">
      <h4>${escapeHtml(user.username)}</h4>
      <div class="list-item-meta">Registrato il: ${user.created}</div>
      <div class="list-item-actions">
        <button class="btn btn-danger" onclick="deleteForumUser('${user.id}')">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

async function deleteForumUser(id) {
  if (!currentAdmin) {
    showAlert('Devi essere loggato come admin!', 'error');
    return;
  }
  
  if (!await checkAdminPermission('manage_users')) {
    showAlert('Non hai i permessi per gestire gli utenti!', 'error');
    return;
  }
  
  if (confirm('Sei sicuro di voler eliminare questo utente? Tutti i suoi post verranno mantenuti.')) {
    const users = await loadData('forum_users', []);
    const updatedUsers = users.filter(u => u.id !== id);
    await saveData('forum_users', updatedUsers);
    await renderUsersList();
    await updateStats();
    showAlert('Utente eliminato con successo!', 'success');
  }
}

/* ========================================
   STAFF MANAGEMENT
   ======================================== */

async function populateRoleSelects() {
  const roles = await loadData('roles', []);
  const staffRoleSelect = document.getElementById('staffRole');
  const editStaffRoleSelect = document.getElementById('editStaffRole');
  
  if (staffRoleSelect) {
    staffRoleSelect.innerHTML = roles.map(r => 
      `<option value="${r.id}">${r.name}</option>`
    ).join('');
  }
  
  if (editStaffRoleSelect) {
    editStaffRoleSelect.innerHTML = roles.map(r => 
      `<option value="${r.id}">${r.name}</option>`
    ).join('');
  }
}

async function renderStaffList() {
  const staffList = document.getElementById('staffList');
  
  if (!staffList) return;
  
  const adminUsers = await loadData('admin_users', []);
  const roles = await loadData('roles', []);
  const staff = adminUsers.filter(u => u.roles && u.roles.length > 0);
  const searchQuery = document.getElementById('adminSearchStaff')?.value.toLowerCase() || '';
  
  let filteredStaff = staff;
  if (searchQuery) {
    filteredStaff = staff.filter(member => 
      member.username.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredStaff.length === 0) {
    staffList.innerHTML = '<p style="color: #8899aa;">Nessuno staff trovato.</p>';
    return;
  }
  
  staffList.innerHTML = filteredStaff.map(member => {
    const memberRoles = roles.filter(r => member.roles.includes(r.id));
    const rolesHTML = memberRoles.map(r => 
      `<span class="role-badge role-${r.color}">${r.name}</span>`
    ).join('');
    
    return `
      <div class="list-item">
        <h4>${escapeHtml(member.username)}</h4>
        <div class="list-item-meta">Ruoli: ${rolesHTML}</div>
        <div class="list-item-meta">Aggiunto il: ${member.created}</div>
        <div class="list-item-actions">
          <button class="btn btn-warning" onclick="editStaff('${member.id}')">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="deleteStaff('${member.id}')">🗑️ Rimuovi</button>
        </div>
      </div>
    `;
  }).join('');
}

async function addStaff() {
  if (!currentAdmin || !await checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per aggiungere staff!', 'error');
    return;
  }

  const username = document.getElementById('staffUsername').value.trim();
  const password = document.getElementById('staffPassword').value;
  const roleId = document.getElementById('staffRole').value;
  
  if (!username || !password || !roleId) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  if (username.length < 3) {
    showAlert('Username troppo corto (minimo 3 caratteri)!', 'error');
    return;
  }

  if (password.length < 4) {
    showAlert('Password troppo corta (minimo 4 caratteri)!', 'error');
    return;
  }
  
  const adminUsers = await loadData('admin_users', []);
  
  if (adminUsers.find(u => u.username === username)) {
    showAlert('Username già esistente!', 'error');
    return;
  }
  
  const newStaff = {
    id: 'admin_' + Date.now(),
    username: username,
    password: password,
    roles: [roleId],
    created: new Date().toISOString().split('T')[0]
  };
  
  adminUsers.push(newStaff);
  await saveData('admin_users', adminUsers);
  
  document.getElementById('staffUsername').value = '';
  document.getElementById('staffPassword').value = '';
  
  await renderStaffList();
  await updateStats();
  showAlert("Staff aggiunto con successo!", 'success');
}

async function editStaff(id) {
  if (!currentAdmin || !await checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per modificare lo staff!', 'error');
    return;
  }
  
  const adminUsers = await loadData('admin_users', []);
  const staff = adminUsers.find(u => u.id === id);
  if (!staff) return;
  
  editingId = id;
  document.getElementById('editStaffUsername').value = staff.username;
  document.getElementById('editStaffPassword').value = '';
  document.getElementById('editStaffRole').value = staff.roles[0] || '';
  openModal('editStaffModal');
}

async function saveEditStaff() {
  if (!currentAdmin || !await checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per modificare lo staff!', 'error');
    return;
  }
  
  const username = document.getElementById('editStaffUsername').value.trim();
  const password = document.getElementById('editStaffPassword').value;
  const roleId = document.getElementById('editStaffRole').value;
  
  if (!username || !roleId) {
    showAlert("Compila tutti i campi obbligatori!", 'error');
    return;
  }
  
  const adminUsers = await loadData('admin_users', []);
  const staff = adminUsers.find(u => u.id === editingId);
  
  if (staff) {
    staff.username = username;
    if (password) {
      staff.password = password;
    }
    staff.roles = [roleId];
    
    await saveData('admin_users', adminUsers);
    await renderStaffList();
    closeModal('editStaffModal');
    showAlert("Staff modificato con successo!", 'success');
  }
}

async function deleteStaff(id) {
  if (!currentAdmin || !await checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per eliminare lo staff!', 'error');
    return;
  }
  
  const adminUsers = await loadData('admin_users', []);
  const staff = adminUsers.find(u => u.id === id);
  
  if (staff && staff.roles.includes('owner')) {
    const owners = adminUsers.filter(u => u.roles.includes('owner'));
    if (owners.length === 1) {
      showAlert("Non puoi eliminare l'ultimo owner!", 'error');
      return;
    }
  }
  
  if (confirm("Sei sicuro di voler rimuovere questo membro dello staff?")) {
    const updatedUsers = adminUsers.filter(u => u.id !== id);
    await saveData('admin_users', updatedUsers);
    await renderStaffList();
    await updateStats();
    showAlert("Staff rimosso con successo!", 'success');
  }
}

/* ========================================
   PRODUCTS MANAGEMENT
   ======================================== */

async function renderStore() {
  const storeGrid = document.getElementById('storeGrid');
  
  if (!storeGrid) return;
  
  const products = await loadData('products', []);
  
  storeGrid.innerHTML = products.map(product => `
    <div class="store-card ${product.featured ? 'featured' : ''}">
      ${product.featured ? '<div class="badge">Consigliato</div>' : ''}
      <h4>${escapeHtml(product.name)}</h4>
      <ul>
        ${product.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
      <div class="price">€${product.price.toFixed(2)}</div>
      <button class="btn btn-primary">🛒 Acquista</button>
    </div>
  `).join('');
}

async function renderProductsList() {
  const productsList = document.getElementById('productsList');
  
  if (!productsList) return;
  
  const products = await loadData('products', []);
  const searchQuery = document.getElementById('adminSearchProducts')?.value.toLowerCase() || '';
  
  let filteredProducts = products;
  if (searchQuery) {
    filteredProducts = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredProducts.length === 0) {
    productsList.innerHTML = '<p style="color: #8899aa;">Nessun prodotto trovato.</p>';
    return;
  }
  
  const canManageProducts = await checkAdminPermission('manage_products');
  
  productsList.innerHTML = filteredProducts.map(product => `
    <div class="list-item">
      <h4>${escapeHtml(product.name)} ${product.featured ? '⭐' : ''}</h4>
      <div class="list-item-meta">Prezzo: €${product.price.toFixed(2)}</div>
      <div class="list-item-meta">Features:</div>
      <ul style="margin-left: 20px; margin-top: 5px;">
        ${product.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
      ${canManageProducts ? `
        <div class="list-item-actions">
          <button class="btn btn-warning" onclick="editProduct('${product.id}')">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">🗑️ Elimina</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function addProduct() {
  if (!await checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per aggiungere prodotti!', 'error');
    return;
  }
  
  const name = document.getElementById('productName').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const featuresText = document.getElementById('productFeatures').value.trim();
  const featured = document.getElementById('productFeatured').checked;
  
  if (!name || !price || !featuresText) {
    showAlert("Compila tutti i campi!", 'error');
    return;
  }

  if (price <= 0) {
    showAlert("Il prezzo deve essere maggiore di 0!", 'error');
    return;
  }
  
  const features = featuresText.split('\n').filter(f => f.trim());

  if (features.length === 0) {
    showAlert("Inserisci almeno una feature!", 'error');
    return;
  }

  const products = await loadData('products', []);
  
  const newProduct = {
    id: 'prod_' + Date.now(),
    name: name,
    price: price,
    features: features,
    featured: featured
  };
  
  products.push(newProduct);
  await saveData('products', products);
  
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productFeatures').value = '';
  document.getElementById('productFeatured').checked = false;
  
  await renderProductsList();
  await renderStore();
  await updateStats();
  showAlert("Prodotto aggiunto con successo!", 'success');
}

async function editProduct(id) {
  if (!await checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per modificare i prodotti!', 'error');
    return;
  }
  
  const products = await loadData('products', []);
  const product = products.find(p => p.id === id);
  if (!product) return;
  
  editingId = id;
  document.getElementById('editProductName').value = product.name;
  document.getElementById('editProductPrice').value = product.price;
  document.getElementById('editProductFeatures').value = product.features.join('\n');
  document.getElementById('editProductFeatured').checked = product.featured;
  openModal('editProductModal');
}

async function saveEditProduct() {
  if (!await checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per modificare i prodotti!', 'error');
    return;
  }
  
  const name = document.getElementById('editProductName').value.trim();
  const price = parseFloat(document.getElementById('editProductPrice').value);
  const featuresText = document.getElementById('editProductFeatures').value.trim();
  const featured = document.getElementById('editProductFeatured').checked;
  
  if (!name || !price || !featuresText) {
    showAlert("Compila tutti i campi!", 'error');
    return;
  }
  
  const features = featuresText.split('\n').filter(f => f.trim());
  const products = await loadData('products', []);
  const product = products.find(p => p.id === editingId);
  
  if (product) {
    product.name = name;
    product.price = price;
    product.features = features;
    product.featured = featured;
    
    await saveData('products', products);
    await renderProductsList();
    await renderStore();
    closeModal('editProductModal');
    showAlert("Prodotto modificato con successo!", 'success');
  }
}

async function deleteProduct(id) {
  if (!await checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per eliminare i prodotti!', 'error');
    return;
  }
  
  if (confirm("Sei sicuro di voler eliminare questo prodotto?")) {
    const products = await loadData('products', []);
    const updatedProducts = products.filter(p => p.id !== id);
    await saveData('products', updatedProducts);
    await renderProductsList();
    await renderStore();
    await updateStats();
    showAlert("Prodotto eliminato con successo!", 'success');
  }
}

/* ========================================
   ROLES MANAGEMENT
   ======================================== */

async function renderRolesManagement() {
  await renderPermissionsCheckboxes('permissionsCheckboxes');
  await renderRolesList();
}

async function renderPermissionsCheckboxes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = AVAILABLE_PERMISSIONS.map(perm => `
    <div style="margin: 10px 0;">
      <label>
        <input type="checkbox" value="${perm.id}" class="permission-checkbox">
        ${perm.label}
      </label>
    </div>
  `).join('');
}

async function createRole() {
  if (!await hasPermission('manage_roles')) {
    showAlert('Non hai i permessi per creare ruoli!', 'error');
    return;
  }
  
  const name = document.getElementById('roleName').value.trim();
  const color = document.getElementById('roleColor').value;
  const checkboxes = document.querySelectorAll('#permissionsCheckboxes .permission-checkbox');
  const permissions = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  if (!name) {
    showAlert('Inserisci un nome per il ruolo!', 'error');
    return;
  }

  if (name.length < 3) {
    showAlert('Il nome del ruolo deve essere di almeno 3 caratteri!', 'error');
    return;
  }
  
  const roles = await loadData('roles', []);
  const roleId = name.toLowerCase().replace(/\s+/g, '_');
  
  if (roles.find(r => r.id === roleId)) {
    showAlert('Esiste già un ruolo con questo nome!', 'error');
    return;
  }
  
  const newRole = {
    id: roleId,
    name: name,
    color: color,
    permissions: permissions,
    system: false
  };
  
  roles.push(newRole);
  await saveData('roles', roles);
  
  document.getElementById('roleName').value = '';
  document.querySelectorAll('#permissionsCheckboxes .permission-checkbox').forEach(cb => cb.checked = false);
  
  await renderRolesList();
  await populateRoleSelects();
  showAlert('Ruolo creato con successo!', 'success');
}

async function renderRolesList() {
  const rolesList = document.getElementById('rolesList');
  if (!rolesList) return;
  
  const roles = await loadData('roles', []);
  
  rolesList.innerHTML = roles.map(role => {
    const permissionsLabels = role.permissions.map(permId => {
      const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
      return perm ? perm.label : permId;
    }).join(', ');
    
    return `
      <div class="list-item">
        <h4>
          <span class="role-badge role-${role.color}">${role.name}</span>
          ${role.system ? '<span style="color: #8899aa; font-size: 0.8em;">(Sistema)</span>' : ''}
        </h4>
        <div class="list-item-meta">Permessi: ${permissionsLabels || 'Nessuno'}</div>
        ${!role.system ? `
          <div class="list-item-actions">
            <button class="btn btn-warning" onclick="editRole('${role.id}')">✏️ Modifica</button>
            <button class="btn btn-danger" onclick="deleteRole('${role.id}')">🗑️ Elimina</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function editRole(roleId) {
  if (!await hasPermission('manage_roles')) {
    showAlert('Non hai i permessi per modificare i ruoli!', 'error');
    return;
  }
  
  const roles = await loadData('roles', []);
  const role = roles.find(r => r.id === roleId);
  if (!role || role.system) return;
  
  editingId = roleId;
  document.getElementById('editRoleName').value = role.name;
  document.getElementById('editRoleColor').value = role.color;
  
  await renderPermissionsCheckboxes('editPermissionsCheckboxes');
  
  role.permissions.forEach(permId => {
    const checkbox = document.querySelector(`#editPermissionsCheckboxes input[value="${permId}"]`);
    if (checkbox) checkbox.checked = true;
  });
  
  openModal('editRoleModal');
}

async function saveEditRole() {
  if (!await hasPermission('manage_roles')) {
    showAlert('Non hai i permessi per modificare i ruoli!', 'error');
    return;
  }
  
  const name = document.getElementById('editRoleName').value.trim();
  const color = document.getElementById('editRoleColor').value;
  const checkboxes = document.querySelectorAll('#editPermissionsCheckboxes .permission-checkbox');
  const permissions = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  if (!name) {
    showAlert('Inserisci un nome per il ruolo!', 'error');
    return;
  }
  
  const roles = await loadData('roles', []);
  const role = roles.find(r => r.id === editingId);
  
  if (role && !role.system) {
    role.name = name;
    role.color = color;
    role.permissions = permissions;
    
    await saveData('roles', roles);
    await renderRolesList();
    await populateRoleSelects();
    closeModal('editRoleModal');
    showAlert('Ruolo modificato con successo!', 'success');
  }
}

async function deleteRole(roleId) {
  if (!await hasPermission('manage_roles')) {
    showAlert('Non hai i permessi per eliminare i ruoli!', 'error');
    return;
  }
  
  const roles = await loadData('roles', []);
  const role = roles.find(r => r.id === roleId);
  
  if (role && role.system) {
    showAlert('Non puoi eliminare un ruolo di sistema!', 'error');
    return;
  }
  
  const adminUsers = await loadData('admin_users', []);
  const usersWithRole = adminUsers.filter(u => u.roles && u.roles.includes(roleId));
  
  if (usersWithRole.length > 0) {
    showAlert(`Impossibile eliminare: ${usersWithRole.length} membri staff hanno questo ruolo!`, 'error');
    return;
  }
  
  if (confirm('Sei sicuro di voler eliminare questo ruolo?')) {
    const updatedRoles = roles.filter(r => r.id !== roleId);
    await saveData('roles', updatedRoles);
    await renderRolesList();
    await populateRoleSelects();
    showAlert('Ruolo eliminato con successo!', 'success');
  }
}

/* ========================================
   MODAL MANAGEMENT
   ======================================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
  editingId = null;
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
});