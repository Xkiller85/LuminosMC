"/* ========================================
   LUMINOS MC - VERSIONE STATICA (HTML/CSS/JS)
   Tutti i dati salvati in localStorage
   ======================================== */

let currentUser = null;
let currentAdmin = null;
let editingId = null;
let isRegistering = false;
let currentPage = 1;
const postsPerPage = 5;

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
   STORAGE FUNCTIONS
   ======================================== */

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Errore nel salvare i dati:', error);
    return false;
  }
}

function loadData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Errore nel caricare i dati:', error);
    return defaultValue;
  }
}

function deleteData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Errore nell\'eliminare i dati:', error);
    return false;
  }
}

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  initializeSystem();
  checkAuth();
  loadAllData();
  renderStore();
  renderAllPosts();
  updateStats();
});

function initializeSystem() {
  // Inizializza admin users
  let adminUsers = loadData('admin_users', []);
  if (adminUsers.length === 0) {
    const ownerAdmin = {
      id: generateId(),
      username: 'TheMarck_MC',
      password: 'admin123', // In produzione usa hashing
      roles: ['owner'],
      created: getCurrentDate()
    };
    adminUsers.push(ownerAdmin);
    saveData('admin_users', adminUsers);
  }

  // Inizializza ruoli
  let roles = loadData('roles', []);
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
    saveData('roles', defaultRoles);
  }

  // Inizializza prodotti
  let products = loadData('products', []);
  if (products.length === 0) {
    const defaultProducts = [
      {
        id: generateId(),
        name: \\"VIP Bronze\\",
        price: 4.99,
        features: [\\"Prefix dedicato\\", \\"Kit giornaliero\\", \\"Queue prioritaria\\"],
        featured: false
      },
      {
        id: generateId(),
        name: \\"VIP Silver\\",
        price: 9.99,
        features: [\\"Tutto di Bronze\\", \\"Particles esclusive\\", \\"/hat e /nick\\"],
        featured: false
      },
      {
        id: generateId(),
        name: \\"VIP Gold\\",
        price: 14.99,
        features: [\\"Tutto di Silver\\", \\"Kit potenziato Lifesteal\\", \\"Slot riservato\\"],
        featured: true
      },
      {
        id: generateId(),
        name: \\"VIP Legend\\",
        price: 24.99,
        features: [\\"Tutto di Gold\\", \\"Emote custom\\", \\"Ricompense evento +\\"],
        featured: false
      }
    ];
    saveData('products', defaultProducts);
  }

  // Inizializza posts
  let posts = loadData('posts', []);
  if (posts.length === 0) {
    const defaultPosts = [
      {
        id: generateId(),
        title: \\"[Guida] Come proteggere i cuori nella Lifesteal\\",
        content: \\"Condividiamo strategie per non perdere cuori: teamplay, kit smart e ritirata strategica.\\",
        author: \\"Admin\\",
        date: getCurrentDate(),
        replies: []
      },
      {
        id: generateId(),
        title: \\"Proposte eventi del weekend\\",
        content: \\"Mini-tornei, caccia al tesoro, e drop party: dite la vostra!\\",
        author: \\"Admin\\",
        date: getCurrentDate(),
        replies: []
      }
    ];
    saveData('posts', defaultPosts);
  }
}

function loadAllData() {
  // I dati vengono caricati dinamicamente quando servono
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/* ========================================
   ADMIN AUTHENTICATION
   ======================================== */

function handleAdminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const adminUsers = loadData('admin_users', []);
  const admin = adminUsers.find(u => u.username === username && u.password === password);

  if (admin) {
    currentAdmin = { ...admin };
    localStorage.setItem('currentAdmin', JSON.stringify(admin));
    showAlert('Accesso admin effettuato!', 'success');
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    renderAdminContent();
  } else {
    showAlert('Credenziali admin errate!', 'error');
  }
}

function logoutAdmin() {
  currentAdmin = null;
  localStorage.removeItem('currentAdmin');
  document.getElementById('adminLoginSection').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminUsername').value = '';
  document.getElementById('adminPassword').value = '';
  showAlert('Logout admin effettuato!', 'success');
}

function checkAdminPermission(permission) {
  if (!currentAdmin) return false;
  
  const roles = loadData('roles', []);
  const adminRoles = roles.filter(r => currentAdmin.roles.includes(r.id));
  
  return adminRoles.some(role => role.permissions.includes(permission));
}

/* ========================================
   USER AUTHENTICATION
   ======================================== */

function switchToRegister() {
  isRegistering = !isRegistering;
  const title = document.getElementById('loginTitle');
  const hint = document.getElementById('loginHint');
  const button = document.getElementById('loginBtn');
  
  if (isRegistering) {
    title.textContent = '📝 Registrazione';
    hint.innerHTML = 'Hai già un account? <a onclick=\\"switchToRegister()\\">Accedi</a><br>oppure <a onclick=\\"showPage(\'home\')\">torna alla home</a>';
    button.textContent = 'Registrati';
    button.onclick = handleRegister;
  } else {
    title.textContent = '🔐 Login';
    hint.innerHTML = 'Non hai un account? <a onclick=\\"switchToRegister()\\">Registrati</a><br>oppure <a onclick=\\"showPage(\'home\')\">torna alla home</a>';
    button.textContent = 'Accedi';
    button.onclick = handleLogin;
  }
}

function handleRegister() {
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

  const users = loadData('forum_users', []);
  
  if (users.find(u => u.username === username)) {
    showAlert('Username già esistente!', 'error');
    return;
  }

  const newUser = {
    id: generateId(),
    username: username,
    password: password,
    created: getCurrentDate()
  };

  users.push(newUser);
  saveData('forum_users', users);
  
  showAlert('Registrazione completata! Ora puoi accedere.', 'success');
  
  switchToRegister();
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = '';
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const users = loadData('forum_users', []);
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    currentUser = { ...user };
    localStorage.setItem('currentUser', JSON.stringify(user));
    showAlert('Login effettuato con successo!', 'success');
    updateUserInfo();
    showPage('home');
    
    document.getElementById('forumCreatePost').style.display = 'block';
    document.getElementById('userPostsCard').style.display = 'block';
    
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  } else {
    showAlert('Credenziali errate!', 'error');
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateUserInfo();
  showPage('home');
  showAlert('Logout effettuato con successo!', 'success');
  
  document.getElementById('forumCreatePost').style.display = 'none';
  document.getElementById('userPostsCard').style.display = 'none';
}

function checkAuth() {
  const savedUser = localStorage.getItem('currentUser');
  const savedAdmin = localStorage.getItem('currentAdmin');
  
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById('forumCreatePost').style.display = 'block';
    document.getElementById('userPostsCard').style.display = 'block';
  }
  
  if (savedAdmin) {
    currentAdmin = JSON.parse(savedAdmin);
  }
  
  updateUserInfo();
}

function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  const rolesBtn = document.getElementById('rolesBtn');
  const user = currentAdmin || currentUser;
  
  if (user) {
    const roles = loadData('roles', []);
    const userRoles = user.roles ? roles.filter(r => user.roles.includes(r.id)) : [];
    const rolesHTML = userRoles.map(r => `<span class=\\"role-badge role-${r.color}\\">${r.name}</span>`).join('');
    
    userInfo.innerHTML = `
      <span>👤 ${user.username}</span>
      ${rolesHTML}
      <button class=\\"btn-logout\\" onclick=\\"${currentAdmin ? 'logoutAdmin' : 'logout'}()\\">Esci</button>
    `;
    
    if (hasPermission('manage_roles')) {
      if (rolesBtn) rolesBtn.style.display = 'inline-block';
    } else {
      if (rolesBtn) rolesBtn.style.display = 'none';
    }
  } else {
    userInfo.innerHTML = '';
    if (rolesBtn) rolesBtn.style.display = 'none';
  }
}

function hasPermission(permission) {
  const user = currentAdmin || currentUser;
  if (!user || !user.roles) return false;
  
  const roles = loadData('roles', []);
  const userRoles = roles.filter(r => user.roles.includes(r.id));
  
  return userRoles.some(role => role.permissions.includes(permission));
}

/* ========================================
   PAGE NAVIGATION
   ======================================== */

function showPage(pageName) {
  if (pageName === 'forum' && !currentUser) {
    showAlert('Devi essere registrato per accedere al forum!', 'error');
    showPage('login');
    return;
  }
  
  if (pageName === 'admin') {
    document.getElementById('adminLoginSection').style.display = currentAdmin ? 'none' : 'block';
    document.getElementById('adminPanel').style.display = currentAdmin ? 'block' : 'none';
  }
  
  if (pageName === 'roles' && !hasPermission('manage_roles')) {
    showAlert('Accesso negato! Solo gli owner possono gestire i ruoli.', 'error');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const page = document.getElementById(pageName);
  if (page) page.classList.add('active');
  
  const navBtn = document.querySelector(`[data-page=\\"${pageName}\\"]`);
  if (navBtn) navBtn.classList.add('active');
  
  if (pageName === 'forum') {
    renderPosts();
    renderAllPosts();
  }
  if (pageName === 'store') {
    renderStore();
  }
  if (pageName === 'admin' && currentAdmin) {
    renderAdminContent();
  }
  if (pageName === 'roles') {
    renderRolesManagement();
  }
}

/* ========================================
   ADMIN TABS
   ======================================== */

function showAdminTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
  
  const tab = document.getElementById(tabName);
  if (tab) tab.classList.add('active');
  
  const btn = document.querySelector(`[data-tab=\\"${tabName}\\"]`);
  if (btn) btn.classList.add('active');

  renderAdminContent();
}

function renderAdminContent() {
  renderAdminPosts();
  renderStaffList();
  renderProductsList();
  renderUsersList();
  updateStats();
  populateRoleSelects();
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
  const ip = \\"play.luminosmc.it\\";
  const tempInput = document.createElement('input');
  tempInput.value = ip;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  showAlert(\\"IP copiato negli appunti!\\", 'success');
}

function updateStats() {
  const posts = loadData('posts', []);
  const users = loadData('forum_users', []);
  const adminUsers = loadData('admin_users', []);
  const staff = adminUsers.filter(u => u.roles && u.roles.length > 0);
  const products = loadData('products', []);
  
  const totalPostsEl = document.getElementById('totalPosts');
  const totalUsersEl = document.getElementById('totalUsers');
  const totalStaffEl = document.getElementById('totalStaff');
  const totalProductsEl = document.getElementById('totalProducts');
  
  if (totalPostsEl) totalPostsEl.textContent = posts.length;
  if (totalUsersEl) totalUsersEl.textContent = users.length;
  if (totalStaffEl) totalStaffEl.textContent = staff.length;
  if (totalProductsEl) totalProductsEl.textContent = products.length;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ========================================
   POSTS MANAGEMENT
   ======================================== */

function createPost() {
  if (!currentUser) {
    showAlert('Devi essere loggato per creare un post!', 'error');
    return;
  }
  
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  
  if (!title || !content) {
    showAlert(\\"Compila tutti i campi!\\", 'error');
    return;
  }

  if (title.length < 5) {
    showAlert(\\"Il titolo deve essere di almeno 5 caratteri!\\", 'error');
    return;
  }

  if (content.length < 10) {
    showAlert(\\"Il contenuto deve essere di almeno 10 caratteri!\\", 'error');
    return;
  }
  
  const posts = loadData('posts', []);
  
  const newPost = {
    id: generateId(),
    title: title,
    content: content,
    author: currentUser.username,
    date: getCurrentDate(),
    replies: []
  };
  
  posts.push(newPost);
  saveData('posts', posts);
  
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  renderPosts();
  renderAllPosts();
  showAlert(\\"Post pubblicato con successo!\\", 'success');
}

function renderAllPosts() {
  const allPostsList = document.getElementById('allPostsList');
  
  if (!allPostsList) return;
  
  const posts = loadData('posts', []);
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
    allPostsList.innerHTML = '<p style=\\"color: #8899aa;\\">Nessun post trovato.</p>';
    return;
  }
  
  const sortedPosts = [...filteredPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  allPostsList.innerHTML = sortedPosts.map(post => `
    <div class=\\"post\\">
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.content)}</p>
      <div class=\\"post-meta\\">Autore: ${escapeHtml(post.author)} | Data: ${post.date} | Risposte: ${post.replies.length}</div>
      ${post.replies.length > 0 ? `
        <div class=\\"post-replies\\">
          <strong>Risposte (${post.replies.length}):</strong>
          ${post.replies.map(reply => `
            <div class=\\"reply\\">
              <p>${escapeHtml(reply.content)}</p>
              <div class=\\"reply-meta\\">Da: ${escapeHtml(reply.author)} | ${reply.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${currentUser ? `
        <div class=\\"post-actions\\">
          <button class=\\"btn btn-success\\" onclick=\\"replyToPostUser('${post.id}')\\">💬 Rispondi</button>
          ${post.author === currentUser.username || hasPermission('edit_any_post') ? `
            <button class=\\"btn btn-warning\\" onclick=\\"editUserPost('${post.id}')\\">✏️ Modifica</button>
            <button class=\\"btn btn-danger\\" onclick=\\"deleteUserPost('${post.id}')\\">🗑️ Elimina</button>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderPosts() {
  const userPostsList = document.getElementById('userPostsList');
  
  if (!userPostsList || !currentUser) return;
  
  const posts = loadData('posts', []);
  const userPosts = posts.filter(p => p.author === currentUser.username);
  
  if (userPosts.length === 0) {
    userPostsList.innerHTML = '<p style=\\"color: #8899aa;\\">Non hai ancora pubblicato nessun post.</p>';
    return;
  }
  
  userPostsList.innerHTML = userPosts.map(post => `
    <div class=\\"post\\">
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.content)}</p>
      <div class=\\"post-meta\\">Data: ${post.date} | Risposte: ${post.replies.length}</div>
      ${post.replies.length > 0 ? `
        <div class=\\"post-replies\\">
          <strong>Risposte (${post.replies.length}):</strong>
          ${post.replies.map(reply => `
            <div class=\\"reply\\">
              <p>${escapeHtml(reply.content)}</p>
              <div class=\\"reply-meta\\">Da: ${escapeHtml(reply.author)} | ${reply.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class=\\"post-actions\\">
        <button class=\\"btn btn-warning\\" onclick=\\"editUserPost('${post.id}')\\">✏️ Modifica</button>
        <button class=\\"btn btn-danger\\" onclick=\\"deleteUserPost('${post.id}')\\">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

function editUserPost(id) {
  const posts = loadData('posts', []);
  const post = posts.find(p => p.id === id);
  
  if (!post || (post.author !== currentUser?.username && !hasPermission('edit_any_post'))) {
    showAlert(\\"Non puoi modificare questo post!\\", 'error');
    return;
  }
  
  editingId = id;
  document.getElementById('editPostTitle').value = post.title;
  document.getElementById('editPostContent').value = post.content;
  openModal('editPostModal');
}

function deleteUserPost(id) {
  const posts = loadData('posts', []);
  const post = posts.find(p => p.id === id);
  
  if (!post || (post.author !== currentUser?.username && !hasPermission('delete_any_post'))) {
    showAlert(\\"Non puoi eliminare questo post!\\", 'error');
    return;
  }
  
  if (confirm(\\"Sei sicuro di voler eliminare questo post?\\")) {
    const updatedPosts = posts.filter(p => p.id !== id);
    saveData('posts', updatedPosts);
    renderPosts();
    renderAllPosts();
    updateStats();
    showAlert(\\"Post eliminato con successo!\\", 'success');
  }
}

function replyToPostUser(id) {
  if (!currentUser) {
    showAlert('Devi essere loggato per rispondere!', 'error');
    return;
  }
  
  const posts = loadData('posts', []);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  
  editingId = id;
  document.getElementById('replyPostPreview').innerHTML = `
    <h4>${escapeHtml(post.title)}</h4>
    <p>${escapeHtml(post.content)}</p>
    <div class=\\"reply-meta\\">Da: ${escapeHtml(post.author)} | ${post.date}</div>
  `;
  document.getElementById('replyContent').value = '';
  openModal('replyPostModal');
}

function saveEditPost() {
  const title = document.getElementById('editPostTitle').value.trim();
  const content = document.getElementById('editPostContent').value.trim();
  
  if (!title || !content) {
    showAlert(\\"Compila tutti i campi!\\", 'error');
    return;
  }
  
  const posts = loadData('posts', []);
  const post = posts.find(p => p.id === editingId);
  
  if (post) {
    post.title = title;
    post.content = content;
    saveData('posts', posts);
    renderPosts();
    renderAllPosts();
    renderAdminPosts();
    closeModal('editPostModal');
    showAlert(\\"Post modificato con successo!\\", 'success');
  }
}

function saveReply() {
  const content = document.getElementById('replyContent').value.trim();
  
  if (!content) {
    showAlert(\\"Scrivi una risposta!\\", 'error');
    return;
  }

  if (content.length < 3) {
    showAlert(\\"La risposta deve essere di almeno 3 caratteri!\\", 'error');
    return;
  }
  
  const posts = loadData('posts', []);
  const post = posts.find(p => p.id === editingId);
  
  if (post) {
    const author = currentUser ? currentUser.username : (currentAdmin ? currentAdmin.username : 'Admin');
    const reply = {
      content: content,
      author: author,
      date: getCurrentDate()
    };
    post.replies.push(reply);
    saveData('posts', posts);
    renderPosts();
    renderAllPosts();
    renderAdminPosts();
    closeModal('replyPostModal');
    showAlert(\\"Risposta inviata con successo!\\", 'success');
  }
}

/* ========================================
   ADMIN POSTS
   ======================================== */

function renderAdminPosts() {
  const adminPostsList = document.getElementById('adminPostsList');
  
  if (!adminPostsList) return;
  
  const posts = loadData('posts', []);
  const searchQuery = document.getElementById('adminSearchPosts')?.value.toLowerCase() || '';
  
  let filteredPosts = posts;
  if (searchQuery) {
    filteredPosts = posts.filter(post => 
      post.title.toLowerCase().includes(searchQuery) ||
      post.author.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredPosts.length === 0) {
    adminPostsList.innerHTML = '<p style=\\"color: #8899aa;\\">Nessun post trovato.</p>';
    return;
  }
  
  adminPostsList.innerHTML = filteredPosts.map(post => `
    <div class=\\"list-item\\">
      <h4>${escapeHtml(post.title)}</h4>
      <div class=\\"list-item-meta\\">Autore: ${escapeHtml(post.author)}</div>
      <div class=\\"list-item-meta\\">Data: ${post.date}</div>
      <div class=\\"list-item-meta\\">Risposte: ${post.replies.length}</div>
      <div class=\\"list-item-actions\\">
        <button class=\\"btn btn-danger\\" onclick=\\"deleteAdminPost('${post.id}')\\">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

function deleteAdminPost(id) {
  if (!checkAdminPermission('delete_any_post')) {
    showAlert('Non hai i permessi per eliminare i post!', 'error');
    return;
  }
  
  if (confirm(\\"Sei sicuro di voler eliminare questo post?\\")) {
    const posts = loadData('posts', []);
    const updatedPosts = posts.filter(p => p.id !== id);
    saveData('posts', updatedPosts);
    renderAdminPosts();
    updateStats();
    showAlert(\\"Post eliminato con successo!\\", 'success');
  }
}

/* ========================================
   USERS DATABASE
   ======================================== */

function renderUsersList() {
  const usersList = document.getElementById('usersList');
  
  if (!usersList) return;
  
  const users = loadData('forum_users', []);
  const searchQuery = document.getElementById('adminSearchUsers')?.value.toLowerCase() || '';
  
  let filteredUsers = users;
  if (searchQuery) {
    filteredUsers = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery) ||
      user.id.includes(searchQuery)
    );
  }
  
  if (filteredUsers.length === 0) {
    usersList.innerHTML = '<p style=\\"color: #8899aa;\\">Nessun utente trovato.</p>';
    return;
  }
  
  usersList.innerHTML = filteredUsers.map(user => `
    <div class=\\"list-item\\">
      <h4>${escapeHtml(user.username)}</h4>
      <div class=\\"list-item-meta\\">ID: ${user.id}</div>
      <div class=\\"list-item-meta\\">Registrato il: ${user.created}</div>
      <div class=\\"list-item-actions\\">
        <button class=\\"btn btn-danger\\" onclick=\\"deleteForumUser('${user.id}')\\">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

function deleteForumUser(id) {
  if (!currentAdmin || !checkAdminPermission('manage_users')) {
    showAlert('Non hai i permessi per eliminare gli utenti!', 'error');
    return;
  }
  
  if (confirm('Sei sicuro di voler eliminare questo utente?')) {
    const users = loadData('forum_users', []);
    const updatedUsers = users.filter(u => u.id !== id);
    saveData('forum_users', updatedUsers);
    renderUsersList();
    updateStats();
    showAlert('Utente eliminato con successo!', 'success');
  }
}

/* ========================================
   STAFF MANAGEMENT
   ======================================== */

function populateRoleSelects() {
  const roles = loadData('roles', []);
  const staffRoleSelect = document.getElementById('staffRole');
  const editStaffRoleSelect = document.getElementById('editStaffRole');
  
  if (staffRoleSelect) {
    staffRoleSelect.innerHTML = roles.map(r => 
      `<option value=\\"${r.id}\\">${r.name}</option>`
    ).join('');
  }
  
  if (editStaffRoleSelect) {
    editStaffRoleSelect.innerHTML = roles.map(r => 
      `<option value=\\"${r.id}\\">${r.name}</option>`
    ).join('');
  }
}

function renderStaffList() {
  const staffList = document.getElementById('staffList');
  
  if (!staffList) return;
  
  const adminUsers = loadData('admin_users', []);
  const roles = loadData('roles', []);
  const staff = adminUsers.filter(u => u.roles && u.roles.length > 0);
  const searchQuery = document.getElementById('adminSearchStaff')?.value.toLowerCase() || '';
  
  let filteredStaff = staff;
  if (searchQuery) {
    filteredStaff = staff.filter(member => 
      member.username.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredStaff.length === 0) {
    staffList.innerHTML = '<p style=\\"color: #8899aa;\\">Nessuno staff trovato.</p>';
    return;
  }
  
  staffList.innerHTML = filteredStaff.map(member => {
    const memberRoles = roles.filter(r => member.roles.includes(r.id));
    const rolesHTML = memberRoles.map(r => 
      `<span class=\\"role-badge role-${r.color}\\">${r.name}</span>`
    ).join('');
    
    return `
      <div class=\\"list-item\\">
        <h4>${escapeHtml(member.username)}</h4>
        <div class=\\"list-item-meta\\">Ruoli: ${rolesHTML}</div>
        <div class=\\"list-item-meta\\">Aggiunto il: ${member.created}</div>
        <div class=\\"list-item-actions\\">
          <button class=\\"btn btn-warning\\" onclick=\\"editStaff('${member.id}')\\">✏️ Modifica</button>
          <button class=\\"btn btn-danger\\" onclick=\\"deleteStaff('${member.id}')\\">🗑️ Rimuovi</button>
        </div>
      </div>
    `;
  }).join('');
}

function addStaff() {
  if (!currentAdmin || !checkAdminPermission('manage_staff')) {
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
  
  const adminUsers = loadData('admin_users', []);
  
  if (adminUsers.find(u => u.username === username)) {
    showAlert('Username già esistente!', 'error');
    return;
  }
  
  const newStaff = {
    id: generateId(),
    username: username,
    password: password,
    roles: [roleId],
    created: getCurrentDate()
  };
  
  adminUsers.push(newStaff);
  saveData('admin_users', adminUsers);
  
  document.getElementById('staffUsername').value = '';
  document.getElementById('staffPassword').value = '';
  
  renderStaffList();
  updateStats();
  showAlert(\\"Staff aggiunto con successo!\\", 'success');
}

function editStaff(id) {
  if (!currentAdmin || !checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per modificare lo staff!', 'error');
    return;
  }
  
  const adminUsers = loadData('admin_users', []);
  const staff = adminUsers.find(u => u.id === id);
  if (!staff) return;
  
  editingId = id;
  document.getElementById('editStaffUsername').value = staff.username;
  document.getElementById('editStaffPassword').value = '';
  document.getElementById('editStaffRole').value = staff.roles[0] || '';
  openModal('editStaffModal');
}

function saveEditStaff() {
  if (!currentAdmin || !checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per modificare lo staff!', 'error');
    return;
  }
  
  const username = document.getElementById('editStaffUsername').value.trim();
  const password = document.getElementById('editStaffPassword').value;
  const roleId = document.getElementById('editStaffRole').value;
  
  if (!username || !roleId) {
    showAlert(\\"Compila tutti i campi obbligatori!\\", 'error');
    return;
  }
  
  const adminUsers = loadData('admin_users', []);
  const staff = adminUsers.find(u => u.id === editingId);
  
  if (staff) {
    staff.username = username;
    if (password) {
      staff.password = password;
    }
    staff.roles = [roleId];
    
    saveData('admin_users', adminUsers);
    renderStaffList();
    closeModal('editStaffModal');
    showAlert(\\"Staff modificato con successo!\\", 'success');
  }
}

function deleteStaff(id) {
  if (!currentAdmin || !checkAdminPermission('manage_staff')) {
    showAlert('Non hai i permessi per eliminare lo staff!', 'error');
    return;
  }
  
  const adminUsers = loadData('admin_users', []);
  const staff = adminUsers.find(u => u.id === id);
  
  if (staff && staff.roles.includes('owner') && staff.username === 'TheMarck_MC') {
    showAlert(\\"Non puoi eliminare l'owner principale!\\", 'error');
    return;
  }
  
  if (confirm(\\"Sei sicuro di voler rimuovere questo membro dello staff?\\")) {
    const updatedUsers = adminUsers.filter(u => u.id !== id);
    saveData('admin_users', updatedUsers);
    renderStaffList();
    updateStats();
    showAlert(\\"Staff rimosso con successo!\\", 'success');
  }
}

/* ========================================
   PRODUCTS MANAGEMENT
   ======================================== */

function renderStore() {
  const storeGrid = document.getElementById('storeGrid');
  
  if (!storeGrid) return;
  
  const products = loadData('products', []);
  
  storeGrid.innerHTML = products.map(product => `
    <div class=\\"store-card ${product.featured ? 'featured' : ''}\\">
      ${product.featured ? '<div class=\\"badge\\">Consigliato</div>' : ''}
      <h4>${escapeHtml(product.name)}</h4>
      <ul>
        ${product.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
      <div class=\\"price\\">€${product.price.toFixed(2)}</div>
      <button class=\\"btn btn-primary\\">🛒 Acquista</button>
    </div>
  `).join('');
}

function renderProductsList() {
  const productsList = document.getElementById('productsList');
  
  if (!productsList) return;
  
  const products = loadData('products', []);
  const searchQuery = document.getElementById('adminSearchProducts')?.value.toLowerCase() || '';
  
  let filteredProducts = products;
  if (searchQuery) {
    filteredProducts = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery)
    );
  }
  
  if (filteredProducts.length === 0) {
    productsList.innerHTML = '<p style=\\"color: #8899aa;\\">Nessun prodotto trovato.</p>';
    return;
  }
  
  const canManageProducts = checkAdminPermission('manage_products');
  
  productsList.innerHTML = filteredProducts.map(product => `
    <div class=\\"list-item\\">
      <h4>${escapeHtml(product.name)} ${product.featured ? '⭐' : ''}</h4>
      <div class=\\"list-item-meta\\">Prezzo: €${product.price.toFixed(2)}</div>
      <div class=\\"list-item-meta\\">Features:</div>
      <ul style=\\"margin-left: 20px; margin-top: 5px;\\">
        ${product.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
      ${canManageProducts ? `
        <div class=\\"list-item-actions\\">
          <button class=\\"btn btn-warning\\" onclick=\\"editProduct('${product.id}')\\">✏️ Modifica</button>
          <button class=\\"btn btn-danger\\" onclick=\\"deleteProduct('${product.id}')\\">🗑️ Elimina</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function addProduct() {
  if (!checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per aggiungere prodotti!', 'error');
    return;
  }
  
  const name = document.getElementById('productName').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const featuresText = document.getElementById('productFeatures').value.trim();
  const featured = document.getElementById('productFeatured').checked;
  
  if (!name || !price || !featuresText) {
    showAlert(\\"Compila tutti i campi!\\", 'error');
    return;
  }

  if (price <= 0) {
    showAlert(\\"Il prezzo deve essere maggiore di 0!\\", 'error');
    return;
  }
  
  const features = featuresText.split('\
').filter(f => f.trim());

  if (features.length === 0) {
    showAlert(\\"Inserisci almeno una feature!\\", 'error');
    return;
  }

  const products = loadData('products', []);
  
  const newProduct = {
    id: generateId(),
    name: name,
    price: price,
    features: features,
    featured: featured
  };
  
  products.push(newProduct);
  saveData('products', products);
  
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productFeatures').value = '';
  document.getElementById('productFeatured').checked = false;
  
  renderProductsList();
  renderStore();
  updateStats();
  showAlert(\\"Prodotto aggiunto con successo!\\", 'success');
}

function editProduct(id) {
  if (!checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per modificare i prodotti!', 'error');
    return;
  }
  
  const products = loadData('products', []);
  const product = products.find(p => p.id === id);
  if (!product) return;
  
  editingId = id;
  document.getElementById('editProductName').value = product.name;
  document.getElementById('editProductPrice').value = product.price;
  document.getElementById('editProductFeatures').value = product.features.join('\
');
  document.getElementById('editProductFeatured').checked = product.featured;
  openModal('editProductModal');
}

function saveEditProduct() {
  if (!checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per modificare i prodotti!', 'error');
    return;
  }
  
  const name = document.getElementById('editProductName').value.trim();
  const price = parseFloat(document.getElementById('editProductPrice').value);
  const featuresText = document.getElementById('editProductFeatures').value.trim();
  const featured = document.getElementById('editProductFeatured').checked;
  
  if (!name || !price || !featuresText) {
    showAlert(\\"Compila tutti i campi!\\", 'error');
    return;
  }
  
  const features = featuresText.split('\
').filter(f => f.trim());
  const products = loadData('products', []);
  const product = products.find(p => p.id === editingId);
  
  if (product) {
    product.name = name;
    product.price = price;
    product.features = features;
    product.featured = featured;
    
    saveData('products', products);
    renderProductsList();
    renderStore();
    closeModal('editProductModal');
    showAlert(\\"Prodotto modificato con successo!\\", 'success');
  }
}

function deleteProduct(id) {
  if (!checkAdminPermission('manage_products')) {
    showAlert('Non hai i permessi per eliminare i prodotti!', 'error');
    return;
  }
  
  if (confirm(\\"Sei sicuro di voler eliminare questo prodotto?\\")) {
    const products = loadData('products', []);
    const updatedProducts = products.filter(p => p.id !== id);
    saveData('products', updatedProducts);
    renderProductsList();
    renderStore();
    updateStats();
    showAlert(\\"Prodotto eliminato con successo!\\", 'success');
  }
}

/* ========================================
   ROLES MANAGEMENT
   ======================================== */

function renderRolesManagement() {
  renderPermissionsCheckboxes('permissionsCheckboxes');
  renderRolesList();
}

function renderPermissionsCheckboxes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = AVAILABLE_PERMISSIONS.map(perm => `
    <div style=\\"margin: 10px 0;\\">
      <label>
        <input type=\\"checkbox\\" value=\\"${perm.id}\\" class=\\"permission-checkbox\\">
        ${perm.label}
      </label>
    </div>
  `).join('');
}

function createRole() {
  if (!hasPermission('manage_roles')) {
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
  
  const roles = loadData('roles', []);
  
  const roleId = name.toLowerCase().replace(/\\s+/g, '_');
  
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
  saveData('roles', roles);
  
  document.getElementById('roleName').value = '';
  document.querySelectorAll('#permissionsCheckboxes .permission-checkbox').forEach(cb => cb.checked = false);
  
  renderRolesList();
  populateRoleSelects();
  showAlert('Ruolo creato con successo!', 'success');
}

function renderRolesList() {
  const rolesList = document.getElementById('rolesList');
  if (!rolesList) return;
  
  const roles = loadData('roles', []);
  
  rolesList.innerHTML = roles.map(role => {
    const permissionsLabels = role.permissions.map(permId => {
      const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
      return perm ? perm.label : permId;
    }).join(', ');
    
    return `
      <div class=\\"list-item\\">
        <h4>
          <span class=\\"role-badge role-${role.color}\\">${role.name}</span>
          ${role.system ? '<span style=\\"color: #8899aa; font-size: 0.8em;\\">(Sistema)</span>' : ''}
        </h4>
        <div class=\\"list-item-meta\\">Permessi: ${permissionsLabels || 'Nessuno'}</div>
        ${!role.system ? `
          <div class=\\"list-item-actions\\">
            <button class=\\"btn btn-warning\\" onclick=\\"editRole('${role.id}')\\">✏️ Modifica</button>
            <button class=\\"btn btn-danger\\" onclick=\\"deleteRole('${role.id}')\\">🗑️ Elimina</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function editRole(roleId) {
  if (!hasPermission('manage_roles')) {
    showAlert('Non hai i permessi per modificare i ruoli!', 'error');
    return;
  }
  
  const roles = loadData('roles', []);
  const role = roles.find(r => r.id === roleId);
  if (!role || role.system) return;
  
  editingId = roleId;
  document.getElementById('editRoleName').value = role.name;
  document.getElementById('editRoleColor').value = role.color;
  
  renderPermissionsCheckboxes('editPermissionsCheckboxes');
  
  role.permissions.forEach(permId => {
    const checkbox = document.querySelector(`#editPermissionsCheckboxes input[value=\\"${permId}\\"]`);
    if (checkbox) checkbox.checked = true;
  });
  
  openModal('editRoleModal');
}

function saveEditRole() {
  if (!hasPermission('manage_roles')) {
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
  
  const roles = loadData('roles', []);
  const role = roles.find(r => r.id === editingId);
  
  if (role && !role.system) {
    role.name = name;
    role.color = color;
    role.permissions = permissions;
    
    saveData('roles', roles);
    renderRolesList();
    populateRoleSelects();
    closeModal('editRoleModal');
    showAlert('Ruolo modificato con successo!', 'success');
  }
}

function deleteRole(roleId) {
  if (!hasPermission('manage_roles')) {
    showAlert('Non hai i permessi per eliminare i ruoli!', 'error');
    return;
  }
  
  const roles = loadData('roles', []);
  const role = roles.find(r => r.id === roleId);
  
  if (role && role.system) {
    showAlert('Non puoi eliminare un ruolo di sistema!', 'error');
    return;
  }
  
  const adminUsers = loadData('admin_users', []);
  const usersWithRole = adminUsers.filter(u => u.roles && u.roles.includes(roleId));
  
  if (usersWithRole.length > 0) {
    showAlert(`Impossibile eliminare: ${usersWithRole.length} membri staff hanno questo ruolo!`, 'error');
    return;
  }
  
  if (confirm('Sei sicuro di voler eliminare questo ruolo?')) {
    const updatedRoles = roles.filter(r => r.id !== roleId);
    saveData('roles', updatedRoles);
    renderRolesList();
    populateRoleSelects();
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

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal(this.id);
    }
  });
});
"