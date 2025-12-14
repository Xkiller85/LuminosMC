/* LUMINOS MC - SISTEMA COMPLETO */

let currentUser = null;
let currentAdmin = null;
let editingId = null;
let isRegistering = false;

const OWNER = {
  id: 'owner_themarck',
  username: 'TheMarck_MC',
  password: '1234',
  role: 'owner'
};

/* STORAGE */
async function saveData(key, data) {
  try {
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(data), true);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) { console.error(e); }
}

async function loadData(key, def = null) {
  try {
    if (window.storage) {
      const r = await window.storage.get(key, true);
      return r ? JSON.parse(r.value) : def;
    }
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) { return def; }
}

async function saveSession(user) {
  try {
    if (window.storage) {
      await window.storage.set('session', JSON.stringify(user), false);
    } else {
      sessionStorage.setItem('session', JSON.stringify(user));
    }
  } catch (e) { console.error(e); }
}

async function loadSession() {
  try {
    if (window.storage) {
      const r = await window.storage.get('session', false);
      return r ? JSON.parse(r.value) : null;
    }
    const v = sessionStorage.getItem('session');
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

async function clearSession() {
  try {
    if (window.storage) {
      await window.storage.delete('session', false);
    } else {
      sessionStorage.removeItem('session');
    }
  } catch (e) {}
}

/* INIT */
document.addEventListener('DOMContentLoaded', async function() {
  await initSystem();
  await restoreSession();
  await renderStore();
  populateRoleSelects();
});

async function initSystem() {
  const roles = await loadData('roles', []);
  if (roles.length === 0) {
    await saveData('roles', [
      { id: 'owner', name: 'Owner', permissions: ['all'] },
      { id: 'admin', name: 'Admin', permissions: ['manage_forum', 'manage_staff', 'manage_store', 'view_database'] },
      { id: 'moderator', name: 'Moderatore', permissions: ['manage_forum'] },
      { id: 'utente', name: 'Utente', permissions: [] }
    ]);
  }

  const products = await loadData('products', []);
  if (products.length === 0) {
    await saveData('products', [
      { id: 'prod_1', name: "VIP Bronze", price: 4.99, features: ["Prefix dedicato", "Kit giornaliero", "Queue prioritaria"], featured: false },
      { id: 'prod_2', name: "VIP Silver", price: 9.99, features: ["Tutto di Bronze", "Particles esclusive", "/hat e /nick"], featured: false },
      { id: 'prod_3', name: "VIP Gold", price: 14.99, features: ["Tutto di Silver", "Kit potenziato", "Slot riservato"], featured: true }
    ]);
  }
}

async function restoreSession() {
  const s = await loadSession();
  if (s) {
    if (s.isAdmin) {
      currentAdmin = s;
      showAdminPanel();
    } else {
      const users = await loadData('users', []);
      const user = users.find(u => u.id === s.id);
      if (user) {
        currentUser = user;
        updateUserInfo();
        document.getElementById('forumCreatePost').style.display = 'block';
        document.getElementById('userPostsCard').style.display = 'block';
      }
    }
  }
}

/* ADMIN LOGIN */
async function handleAdminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (username === OWNER.username && password === OWNER.password) {
    currentAdmin = { ...OWNER, isAdmin: true };
    await saveSession({ ...OWNER, isAdmin: true });
    showAdminPanel();
    showAlert('Accesso Owner!', 'success');
    return;
  }

  const staff = await loadData('staff', []);
  const member = staff.find(s => s.username === username && s.password === password);
  
  if (member) {
    currentAdmin = { ...member, isAdmin: true };
    await saveSession({ ...member, isAdmin: true });
    showAdminPanel();
    showAlert('Accesso Staff!', 'success');
  } else {
    showAlert('Credenziali errate!', 'error');
  }
}

function showAdminPanel() {
  document.getElementById('adminLoginSection').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  renderAdminContent();
}

async function logoutAdmin() {
  currentAdmin = null;
  await clearSession();
  document.getElementById('adminLoginSection').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  showAlert('Logout!', 'success');
}

function isOwner() {
  return currentAdmin && currentAdmin.role === 'owner';
}

/* USER AUTH */
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

  if (username.length < 3 || password.length < 4) {
    showAlert('Username min 3, Password min 4!', 'error');
    return;
  }

  const users = await loadData('users', []);
  
  if (users.find(u => u.username === username)) {
    showAlert('Username esistente!', 'error');
    return;
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username: username,
    password: password,
    role: 'utente',
    created: new Date().toISOString().split('T')[0]
  };

  users.push(newUser);
  await saveData('users', users);
  
  showAlert('Registrato! Accedi ora.', 'success');
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

  const users = await loadData('users', []);
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    currentUser = user;
    await saveSession({ ...user, isAdmin: false });
    showAlert('Login OK!', 'success');
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

async function logout() {
  currentUser = null;
  await clearSession();
  updateUserInfo();
  showPage('home');
  showAlert('Logout!', 'success');
  
  document.getElementById('forumCreatePost').style.display = 'none';
  document.getElementById('userPostsCard').style.display = 'none';
}

function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  
  if (currentUser) {
    userInfo.innerHTML = `
      <span>👤 ${escapeHtml(currentUser.username)}</span>
      <span class="role-badge role-${currentUser.role}">${currentUser.role}</span>
      <button class="btn-logout" onclick="logout()">Esci</button>
    `;
  } else {
    userInfo.innerHTML = '';
  }
}

/* NAVIGATION */
function showPage(pageName) {
  if (pageName === 'forum' && !currentUser) {
    showAlert('Devi registrarti!', 'error');
    showPage('login');
    return;
  }
  
  if (pageName === 'admin') {
    document.getElementById('adminLoginSection').style.display = currentAdmin ? 'none' : 'block';
    document.getElementById('adminPanel').style.display = currentAdmin ? 'block' : 'none';
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const page = document.getElementById(pageName);
  if (page) page.classList.add('active');
  
  const navBtn = document.querySelector(`[data-page="${pageName}"]`);
  if (navBtn) navBtn.classList.add('active');
  
  if (pageName === 'forum') {
    renderUserPosts();
    renderAllPosts();
  }
  if (pageName === 'store') renderStore();
  if (pageName === 'admin' && currentAdmin) renderAdminContent();
}

function showAdminTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
  
  const tab = document.getElementById('admin-' + tabName);
  if (tab) tab.classList.add('active');
  
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');

  renderAdminContent();
}

async function renderAdminContent() {
  await renderAdminForum();
  await renderStaffList();
  await renderAdminStore();
  await renderDatabase();
  await renderRolesList();
}

/* FORUM UTENTI */
async function createPost() {
  if (!currentUser) return showAlert('Loggati!', 'error');
  
  const nickname = document.getElementById('postNickname').value.trim();
  const title = document.getElementById('postTitle').value.trim();
  const description = document.getElementById('postDescription').value.trim();
  
  if (!nickname || !title || !description) return showAlert('Compila tutto!', 'error');
  if (title.length < 5 || description.length < 10) return showAlert('Titolo min 5, Descrizione min 10!', 'error');
  
  const posts = await loadData('posts', []);
  
  posts.push({
    id: 'post_' + Date.now(),
    userId: currentUser.id,
    username: currentUser.username,
    nickname: nickname,
    title: title,
    descriptions: [{
      id: 'desc_' + Date.now(),
      content: description,
      date: new Date().toISOString().split('T')[0]
    }],
    replies: [],
    date: new Date().toISOString().split('T')[0]
  });
  
  await saveData('posts', posts);
  
  document.getElementById('postNickname').value = '';
  document.getElementById('postTitle').value = '';
  document.getElementById('postDescription').value = '';
  
  await renderUserPosts();
  await renderAllPosts();
  showAlert('Post pubblicato!', 'success');
}

async function renderUserPosts() {
  const list = document.getElementById('userPostsList');
  if (!list || !currentUser) return;
  
  const posts = await loadData('posts', []);
  const userPosts = posts.filter(p => p.userId === currentUser.id);
  
  if (userPosts.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun post.</p>';
    return;
  }
  
  list.innerHTML = userPosts.map(post => `
    <div class="post">
      <h4>📌 ${escapeHtml(post.title)}</h4>
      <div class="post-meta">Nickname: ${escapeHtml(post.nickname)} | ${post.date}</div>
      
      <div style="margin-top: 15px;"><strong>Descrizioni:</strong>
        ${post.descriptions.map(d => `
          <div class="reply" style="margin: 10px 0;">
            <p>${escapeHtml(d.content)}</p>
            <div class="reply-meta">${d.date}</div>
          </div>
        `).join('')}
      </div>
      
      ${post.replies.length > 0 ? `
        <div style="margin-top: 15px;"><strong>Risposte Admin (${post.replies.length}):</strong>
          ${post.replies.map(r => `
            <div class="reply">
              <p>${escapeHtml(r.content)}</p>
              <div class="reply-meta">${escapeHtml(r.author)} | ${r.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="post-actions">
        <button class="btn btn-success" onclick="addDescription('${post.id}')">➕ Aggiungi</button>
        <button class="btn btn-danger" onclick="deleteUserPost('${post.id}')">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

async function renderAllPosts() {
  const list = document.getElementById('allPostsList');
  if (!list) return;
  
  const posts = await loadData('posts', []);
  const search = document.getElementById('searchPosts')?.value.toLowerCase() || '';
  
  let filtered = posts;
  if (search) {
    filtered = posts.filter(p => 
      p.title.toLowerCase().includes(search) ||
      p.nickname.toLowerCase().includes(search) ||
      p.username.toLowerCase().includes(search)
    );
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun post.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(post => `
    <div class="post">
      <h4>📌 ${escapeHtml(post.title)}</h4>
      <div class="post-meta">${escapeHtml(post.username)} | Nickname: ${escapeHtml(post.nickname)} | ${post.date}</div>
      
      <div style="margin-top: 15px;"><strong>Descrizioni:</strong>
        ${post.descriptions.map(d => `
          <div class="reply" style="margin: 10px 0;">
            <p>${escapeHtml(d.content)}</p>
            <div class="reply-meta">${d.date}</div>
          </div>
        `).join('')}
      </div>
      
      ${post.replies.length > 0 ? `
        <div style="margin-top: 15px;"><strong>Risposte Admin (${post.replies.length}):</strong>
          ${post.replies.map(r => `
            <div class="reply">
              <p>${escapeHtml(r.content)}</p>
              <div class="reply-meta">${escapeHtml(r.author)} | ${r.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function addDescription(postId) {
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === postId);
  
  if (!post || post.userId !== currentUser?.id) return showAlert('Non puoi!', 'error');
  
  const content = prompt('Nuova descrizione:');
  
  if (content && content.length >= 10) {
    post.descriptions.push({
      id: 'desc_' + Date.now(),
      content: content,
      date: new Date().toISOString().split('T')[0]
    });
    
    await saveData('posts', posts);
    await renderUserPosts();
    await renderAllPosts();
    showAlert('Aggiunta!', 'success');
  } else if (content) {
    showAlert('Min 10 caratteri!', 'error');
  }
}

async function deleteUserPost(postId) {
  if (!confirm('Eliminare?')) return;
  
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === postId);
  
  if (!post || post.userId !== currentUser?.id) return showAlert('Non puoi!', 'error');
  
  const updated = posts.filter(p => p.id !== postId);
  await saveData('posts', updated);
  await renderUserPosts();
  await renderAllPosts();
  showAlert('Eliminato!', 'success');
}

/* ADMIN FORUM */
async function renderAdminForum() {
  const list = document.getElementById('adminForumList');
  if (!list) return;
  
  const posts = await loadData('posts', []);
  const search = document.getElementById('adminSearchForum')?.value.toLowerCase() || '';
  
  let filtered = posts;
  if (search) {
    filtered = posts.filter(p => 
      p.username.toLowerCase().includes(search) ||
      p.title.toLowerCase().includes(search)
    );
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun post.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(post => `
    <div class="post">
      <h4>👤 ${escapeHtml(post.username)}</h4>
      <div style="margin: 10px 0;"><strong style="color: #00f0ff;">📌 ${escapeHtml(post.title)}</strong></div>
      
      <div style="margin-top: 15px;"><strong>Descrizioni:</strong>
        ${post.descriptions.map(d => `
          <div class="reply" style="margin: 10px 0;">
            <p>${escapeHtml(d.content)}</p>
            <div class="reply-meta">${d.date}</div>
          </div>
        `).join('')}
      </div>
      
      ${post.replies.length > 0 ? `
        <div style="margin-top: 15px;"><strong>Tue Risposte (${post.replies.length}):</strong>
          ${post.replies.map(r => `
            <div class="reply">
              <p>${escapeHtml(r.content)}</p>
              <div class="reply-meta">${escapeHtml(r.author)} | ${r.date}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="post-meta">${post.date}</div>
      
      <div class="post-actions">
        <button class="btn btn-success" onclick="replyToPost('${post.id}')">💬 Rispondi</button>
        ${isOwner() ? `<button class="btn btn-danger" onclick="deleteAdminPost('${post.id}')">🗑️ Elimina</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function replyToPost(postId) {
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  
  editingId = postId;
  document.getElementById('replyPostPreview').innerHTML = `
    <h4>${escapeHtml(post.title)}</h4>
    <p><strong>Di:</strong> ${escapeHtml(post.username)}</p>
  `;
  document.getElementById('replyContent').value = '';
  openModal('replyPostModal');
}

async function saveReply() {
  const content = document.getElementById('replyContent').value.trim();
  
  if (!content || content.length < 3) return showAlert('Min 3 caratteri!', 'error');
  
  const posts = await loadData('posts', []);
  const post = posts.find(p => p.id === editingId);
  
  if (post) {
    post.replies.push({
      content: content,
      author: currentAdmin.username,
      date: new Date().toISOString().split('T')[0]
    });
    
    await saveData('posts', posts);
    await renderAdminForum();
    await renderUserPosts();
    await renderAllPosts();
    closeModal('replyPostModal');
    showAlert('Inviata!', 'success');
  }
}

async function deleteAdminPost(postId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  if (!confirm('Eliminare?')) return;
  
  const posts = await loadData('posts', []);
  const updated = posts.filter(p => p.id !== postId);
  await saveData('posts', updated);
  await renderAdminForum();
  showAlert('Eliminato!', 'success');
}

/* ADMIN STAFF */
async function renderStaffList() {
  const list = document.getElementById('staffList');
  if (!list) return;
  
  if (!isOwner()) {
    list.innerHTML = '<p style="color: #8899aa;">Solo owner.</p>';
    return;
  }
  
  const staff = await loadData('staff', []);
  const roles = await loadData('roles', []);
  const search = document.getElementById('adminSearchStaff')?.value.toLowerCase() || '';
  
  let filtered = staff;
  if (search) {
    filtered = staff.filter(s => s.username.toLowerCase().includes(search));
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessuno staff.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(m => {
    const role = roles.find(r => r.id === m.role);
    return `
      <div class="list-item">
        <h4>${escapeHtml(m.username)}</h4>
        <div class="list-item-meta">Username: ${escapeHtml(m.username)}</div>
        <div class="list-item-meta">Password: ${escapeHtml(m.password)}</div>
        <div class="list-item-meta">Ruolo: <span class="role-badge role-${m.role}">${role ? role.name : m.role}</span></div>
        <div class="list-item-actions">
          <button class="btn btn-danger" onclick="deleteStaff('${m.id}')">🗑️ Elimina</button>
        </div>
      </div>
    `;
  }).join('');
}

async function addStaff() {
  if (!isOwner()) return showAlert('Solo owner!', 'error');

  const username = document.getElementById('staffUsername').value.trim();
  const password = document.getElementById('staffPassword').value.trim();
  const role = document.getElementById('staffRole').value;
  
  if (!username || !password || !role) return showAlert('Compila tutto!', 'error');
  if (username.length < 3 || password.length < 4) return showAlert('Username min 3, Password min 4!', 'error');
  
  const staff = await loadData('staff', []);
  
  if (staff.find(s => s.username === username)) return showAlert('Username esistente!', 'error');
  
  staff.push({
    id: 'staff_' + Date.now(),
    username: username,
    password: password,
    role: role,
    created: new Date().toISOString().split('T')[0]
  });
  
  await saveData('staff', staff);
  
  document.getElementById('staffUsername').value = '';
  document.getElementById('staffPassword').value = '';
  
  await renderStaffList();
  showAlert('Aggiunto!', 'success');
}

async function deleteStaff(staffId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  if (!confirm('Eliminare?')) return;
  
  const staff = await loadData('staff', []);
  const updated = staff.filter(s => s.id !== staffId);
  await saveData('staff', updated);
  await renderStaffList();
  showAlert('Eliminato!', 'success');
}

/* ADMIN STORE */
async function renderStore() {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  
  const products = await loadData('products', []);
  
  grid.innerHTML = products.map(p => `
    <div class="store-card ${p.featured ? 'featured' : ''}">
      ${p.featured ? '<div class="badge">Consigliato</div>' : ''}
      <h4>${escapeHtml(p.name)}</h4>
      <ul>${p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      <div class="price">€${p.price.toFixed(2)}</div>
      <button class="btn btn-primary">🛒 Acquista</button>
    </div>
  `).join('');
}

async function renderAdminStore() {
  const list = document.getElementById('adminStoreList');
  if (!list) return;
  
  if (!isOwner()) {
    list.innerHTML = '<p style="color: #8899aa;">Solo owner.</p>';
    return;
  }
  
  const products = await loadData('products', []);
  const search = document.getElementById('adminSearchStore')?.value.toLowerCase() || '';
  
  let filtered = products;
  if (search) {
    filtered = products.filter(p => p.name.toLowerCase().includes(search));
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun prodotto.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(p => `
    <div class="list-item">
      <h4>${escapeHtml(p.name)} ${p.featured ? '⭐' : ''}</h4>
      <div class="list-item-meta">€${p.price.toFixed(2)}</div>
      <div class="list-item-meta">Features:</div>
      <ul style="margin-left: 20px;">${p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      <div class="list-item-actions">
        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

async function addProduct() {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  
  const name = document.getElementById('productName').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const featuresText = document.getElementById('productFeatures').value.trim();
  const featured = document.getElementById('productFeatured').checked;
  
  if (!name || !price || !featuresText) return showAlert('Compila tutto!', 'error');
  if (price <= 0) return showAlert('Prezzo > 0!', 'error');
  
  const features = featuresText.split('\n').filter(f => f.trim());
  if (features.length === 0) return showAlert('Almeno 1 feature!', 'error');

  const products = await loadData('products', []);
  
  products.push({
    id: 'prod_' + Date.now(),
    name: name,
    price: price,
    features: features,
    featured: featured
  });
  
  await saveData('products', products);
  
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productFeatures').value = '';
  document.getElementById('productFeatured').checked = false;
  
  await renderAdminStore();
  await renderStore();
  showAlert('Aggiunto!', 'success');
}

async function deleteProduct(productId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  if (!confirm('Eliminare?')) return;
  
  const products = await loadData('products', []);
  const updated = products.filter(p => p.id !== productId);
  await saveData('products', updated);
  await renderAdminStore();
  await renderStore();
  showAlert('Eliminato!', 'success');
}

/* ADMIN DATABASE */
async function renderDatabase() {
  const list = document.getElementById('databaseList');
  if (!list) return;
  
  if (!isOwner()) {
    list.innerHTML = '<p style="color: #8899aa;">Solo owner.</p>';
    return;
  }
  
  const users = await loadData('users', []);
  const roles = await loadData('roles', []);
  const search = document.getElementById('adminSearchDatabase')?.value.toLowerCase() || '';
  
  let filtered = users;
  if (search) {
    filtered = users.filter(u => u.username.toLowerCase().includes(search));
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun utente.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(u => {
    const role = roles.find(r => r.id === u.role);
    return `
      <div class="list-item">
        <h4>${escapeHtml(u.username)}</h4>
        <div class="list-item-meta">Username: ${escapeHtml(u.username)}</div>
        <div class="list-item-meta">Password: ${escapeHtml(u.password)}</div>
        <div class="list-item-meta">Ruolo: <span class="role-badge role-${u.role}">${role ? role.name : u.role}</span></div>
        <div class="list-item-meta">Registrato: ${u.created}</div>
        <div class="list-item-actions">
          <button class="btn btn-warning" onclick="changeUserRole('${u.id}')">🔄 Cambia Ruolo</button>
          <button class="btn btn-danger" onclick="deleteUser('${u.id}')">🗑️ Elimina</button>
        </div>
      </div>
    `;
  }).join('');
}

async function changeUserRole(userId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  
  const users = await loadData('users', []);
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  const roles = await loadData('roles', []);
  const roleId = prompt(`Nuovo ruolo per ${user.username}:\n${roles.map(r => `- ${r.id}`).join('\n')}`);
  
  if (roleId && roles.find(r => r.id === roleId)) {
    user.role = roleId;
    await saveData('users', users);
    await renderDatabase();
    showAlert('Ruolo cambiato!', 'success');
  } else if (roleId) {
    showAlert('Ruolo non valido!', 'error');
  }
}

async function deleteUser(userId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  if (!confirm('Eliminare utente?')) return;
  
  const users = await loadData('users', []);
  const updated = users.filter(u => u.id !== userId);
  await saveData('users', updated);
  await renderDatabase();
  showAlert('Eliminato!', 'success');
}

/* ADMIN RUOLI */
async function renderRolesList() {
  const list = document.getElementById('rolesList');
  if (!list) return;
  
  if (!isOwner()) {
    list.innerHTML = '<p style="color: #8899aa;">Solo owner.</p>';
    return;
  }
  
  const roles = await loadData('roles', []);
  
  list.innerHTML = roles.map(r => `
    <div class="list-item">
      <h4><span class="role-badge role-${r.id}">${r.name}</span></h4>
      <div class="list-item-meta">ID: ${r.id}</div>
      <div class="list-item-meta">Permessi: ${r.permissions.join(', ')}</div>
      <div class="list-item-actions">
        <button class="btn btn-warning" onclick="editRole('${r.id}')">✏️ Modifica</button>
        ${r.id !== 'owner' && r.id !== 'utente' ? `<button class="btn btn-danger" onclick="deleteRole('${r.id}')">🗑️ Elimina</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function addRole() {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  
  const name = document.getElementById('roleName').value.trim();
  const id = document.getElementById('roleId').value.trim();
  const perms = document.getElementById('rolePermissions').value.trim();
  
  if (!name || !id || !perms) return showAlert('Compila tutto!', 'error');
  
  const roles = await loadData('roles', []);
  
  if (roles.find(r => r.id === id)) return showAlert('ID esistente!', 'error');
  
  roles.push({
    id: id,
    name: name,
    permissions: perms.split(',').map(p => p.trim()).filter(p => p)
  });
  
  await saveData('roles', roles);
  
  document.getElementById('roleName').value = '';
  document.getElementById('roleId').value = '';
  document.getElementById('rolePermissions').value = '';
  
  await renderRolesList();
  populateRoleSelects();
  showAlert('Ruolo creato!', 'success');
}

async function editRole(roleId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  
  const roles = await loadData('roles', []);
  const role = roles.find(r => r.id === roleId);
  if (!role) return;
  
  const perms = prompt(`Permessi per ${role.name} (separati da virgola):`, role.permissions.join(', '));
  
  if (perms !== null) {
    role.permissions = perms.split(',').map(p => p.trim()).filter(p => p);
    await saveData('roles', roles);
    await renderRolesList();
    showAlert('Ruolo modificato!', 'success');
  }
}

async function deleteRole(roleId) {
  if (!isOwner()) return showAlert('Solo owner!', 'error');
  if (roleId === 'owner' || roleId === 'utente') return showAlert('Non puoi eliminare questo!', 'error');
  if (!confirm('Eliminare ruolo?')) return;
  
  const roles = await loadData('roles', []);
  const updated = roles.filter(r => r.id !== roleId);
  await saveData('roles', updated);
  await renderRolesList();
  populateRoleSelects();
  showAlert('Eliminato!', 'success');
}

async function populateRoleSelects() {
  const roles = await loadData('roles', []);
  const staffRole = document.getElementById('staffRole');
  
  if (staffRole) {
    staffRole.innerHTML = roles.filter(r => r.id !== 'owner' && r.id !== 'utente').map(r => 
      `<option value="${r.id}">${r.name}</option>`
    ).join('');
  }
}

/* UTILITIES */
function showAlert(msg, type = 'success') {
  const alert = document.getElementById('alert');
  alert.textContent = msg;
  alert.className = `alert alert-${type} active`;
  setTimeout(() => alert.classList.remove('active'), 3000);
}

function copyIP() {
  navigator.clipboard.writeText("play.luminosmc.it");
  showAlert("IP copiato!", 'success');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
  editingId = null;
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) closeModal(this.id);
    });
  });
});