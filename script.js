/* ========================================
   LUMINOS MC - SCRIPT.JS MIGLIORATO
   ======================================== */

let currentUser = null;
let currentAdmin = null;
let editingId = null;
let isRegistering = false;

// Paginazione
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
   PERSISTENT STORAGE FUNCTIONS
   ======================================== */

async function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Errore nel salvare i dati:', error);
    return false;
  }
}

async function loadData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Errore nel caricare i dati:', error);
    return defaultValue;
  }
}

async function deleteData(key) {
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

document.addEventListener('DOMContentLoaded', async function() {
  await initializeSystem();
  checkAuth();
  await loadAllData();
  renderStore();
  renderAllPosts();
  updateStats();
});

async function initializeSystem() {
  // Inizializza owner se non esiste
  const adminUsers = await loadData('admin_users', []);
  if (adminUsers.length === 0) {
    const ownerAdmin = {
      id: 1,
      username: 'TheMarck_MC',
      password: '1234',
      roles: ['owner'],
      created: new Date().toISOString().split('T')[0]
    };
    adminUsers.push(ownerAdmin);
    await saveData('admin_users', adminUsers);
  }

  // Inizializza ruoli se non esistono
  const roles = await loadData('roles', []);
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
  }

  // Inizializza prodotti se non esistono
  const products = await loadData('products', []);
  if (products.length === 0) {
    const defaultProducts = [
      {
        id: 1,
        name: "VIP Bronze",
        price: 4.99,
        features: ["Prefix dedicato", "Kit giornaliero", "Queue prioritaria"],
        featured: false
      },
      {
        id: 2,
        name: "VIP Silver",
        price: 9.99,
        features: ["Tutto di Bronze", "Particles esclusive", "/hat e /nick"],
        featured: false
      },
      {
        id: 3,
        name: "VIP Gold",
        price: 14.99,
        features: ["Tutto di Silver", "Kit potenziato Lifesteal", "Slot riservato"],
        featured: true
      },
      {
        id: 4,
        name: "VIP Legend",
        price: 24.99,
        features: ["Tutto di Gold", "Emote custom", "Ricompense evento +"],
        featured: false
      }
    ];
    await saveData('products', defaultProducts);
  }

  // Inizializza post di esempio se non esistono
  const posts = await loadData('posts', []);
  if (posts.length === 0) {
    const defaultPosts = [
      {
        id: 1,
        title: "[Guida] Come proteggere i cuori nella Lifesteal",
        content: "Condividiamo strategie per non perdere cuori: teamplay, kit smart e ritirata strategica.",
        author: "TheMarck_MC",
        date: "2025-01-10",
        replies: []
      },
      {
        id: 2,
        title: "Proposte eventi del weekend",
        content: "Mini-tornei, caccia al tesoro, e drop party: dite la vostra!",
        author: "TheMarck_MC",
        date: "2025-01-12",
        replies: []
      }
    ];
    await saveData('posts', defaultPosts);
  }
}

async function loadAllData() {
  // I dati vengono caricati dinamicamente quando servono
}

/* ========================================
   ADMIN AUTHENTICATION
   ======================================== */

async function handleAdminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const adminUsers = await loadData('admin_users', []);
  const admin = adminUsers.find(u => u.username === username && u.password === password);

  if (admin) {
    currentAdmin = { ...admin };
    showAlert('Accesso admin effettuato!', 'success');
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    await renderAdminContent();
  } else {
    showAlert('Credenziali admin errate!', 'error');
  }
}

function logoutAdmin() {
  currentAdmin = null;
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
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
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

function logout() {
  currentUser = null;
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
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
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

async function renderAllPosts() {
  const allPostsList = document.getElementById('allPostsList');
  
  if (!allPostsList) return;
  
  const posts = await loadData('posts', []);
  const searchQuery = document.getElementById('searchPosts')?.value.toLowerCase() || '';
  
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
    allPostsList.innerHTML = '<p style="color: #8899aa;">Nessun post trovato.</p>';
    return;
  }
  
  // Mostra tutti i post ordinati per data (più recenti prima)
  const sortedPosts = [...filteredPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Paginazione
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const paginatedPosts = sortedPosts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);
  
  allPostsList.innerHTML = paginatedPosts.map(post => `
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
      ${currentUser ? `
        <div class="post-actions">
          <button class="btn btn-success" onclick="replyToPostUser(${post.id})">💬 Rispondi</button>
          ${post.author === currentUser.username ? `
            <button class="btn btn-warning" onclick="editUserPost(${post.id})">✏️ Modifica</button>
            <button class="btn btn-danger" onclick="deleteUserPost(${post.id})">🗑️ Elimina</button>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `).join('');

  // Aggiungi paginazione
  if (totalPages > 1) {
    const pagination = `
      <div class="pagination">
        ${currentPage > 1 ? `<button class="btn btn-primary" onclick="changePage(${currentPage - 1})">« Precedente</button>` : ''}
        <span style="margin: 0 15px; color: #00f0ff;">Pagina ${currentPage} di ${totalPages}</span>
        ${currentPage < totalPages ? `<button class="btn btn-primary" onclick="changePage(${currentPage + 1})">Successiva »</button>` : ''}
      </div>
    `;
    allPostsList.innerHTML += pagination;
  }
}

function changePage(page) {
  currentPage = page;
  renderAllPosts();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
        <button class="btn btn-warning" onclick="editUserPost(${post.id})">✏️ Modifica</button>
        <button class="btn btn-danger" onclick="deleteUserPost(${post.id})">🗑️ Elimina</button>
      </div>
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

async function replyToPostUser(id) {
  if (!currentUser) {
    showAlert('Devi essere loggato per rispondere!', 'error');
    return;
  }
  
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

/* ========================================
   ADMIN POSTS MANAGEMENT
   ======================================== */

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
        <button class="btn btn-success" onclick="replyToPost(${post.id})">💬 Rispondi</button>
        ${canEdit ? `<button class="btn btn-warning" onclick="editAdminPost(${post.id})">✏️ Modifica</button>` : ''}
        ${canDelete ? `<button class="btn btn-danger" onclick="deleteAdminPost(${post.id})">🗑️ Elimina</button>` : ''}
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
  
  // Filtra utenti in base alla ricerca
  let filteredUsers = users;
  if (searchQuery) {
    filteredUsers = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery) ||
      user.id.toString().includes(searchQuery)
    );
  }
  
  if (filteredUsers.length === 0) {
    usersList.innerHTML = '<p style="color: #8899aa;">Nessun utente trovato.</p>';
    return;
  }
  
  usersList.innerHTML = filteredUsers.map(user => `
    <div class="list-item">
      <h4>${escapeHtml(user.username)}</h4>
      <div class="list-item-meta">ID: ${user.id}</div>
      <div class="list-item-meta">Registrato il: ${user.created}</div>
      <div class="list-item-actions">
        <button class="btn btn-danger" onclick="deleteForumUser(${user.id})">🗑️ Elimina</button>
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
   STAFF MANAGEMENT - FIXED VERSION
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
  
  // Filtra staff in base alla ricerca
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
          <button class="btn btn-warning" onclick="editStaff(${member.id})">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="deleteStaff(${member.id})">🗑️ Rimuovi</button>
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
  
  // Controlla se l'username esiste già
  if (adminUsers.find(u => u.username === username)) {
    showAlert('Username già esistente!', 'error');
    return;
  }
  
  const newStaff = {
    id: adminUsers.length > 0 ? Math.max(...adminUsers.map(u => u.id)) + 1 : 1,
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
  
  // Non permettere di eliminare l'owner principale
  if (staff && staff.roles.includes('owner') && staff.username === 'TheMarck_MC') {
    showAlert("Non puoi eliminare l'owner principale!", 'error');
    return;
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
  
  // Filtra prodotti in base alla ricerca
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
          <button class="btn btn-warning" onclick="editProduct(${product.id})">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="deleteProduct(${product.id})">🗑️ Elimina</button>
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
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
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
  
  // Genera ID univoco dal nome
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
  
  // Seleziona i permessi del ruolo
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
  
  // Controlla se ci sono utenti con questo ruolo
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

// Close modal on outside click
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
});
