/* ========================================
   LUMINOS MC - SCRIPT.JS CON FIREBASE
   ======================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getDatabase, ref, child, get, set, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ========================================
   FIREBASE CONFIG
   ======================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAp3juPC1YnzBbTWdK0qtGEdj8UcRwpjUA",
  authDomain: "luminosmc-4ee70.firebaseapp.com",
  databaseURL: "https://luminosmc-4ee70-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "luminosmc-4ee70",
  storageBucket: "luminosmc-4ee70.appspot.com",
  messagingSenderId: "125483937552",
  appId: "1:125483937552:web:ea9264b2da064b7ed3ff95",
  measurementId: "G-0Q8THWCHXY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/* ========================================
   VARIABILI GLOBALI
   ======================================== */

let currentUser = null;
let userData = null;
let currentAdmin = null;
let isRegistering = false;
let editingId = null;

const OWNER = {
  username: 'TheMarck_MC',
  password: '1234',
  role: 'owner'
};

/* ========================================
   DATABASE HELPERS
   ======================================== */

async function dbGet(path) {
  const snap = await get(child(ref(db), path));
  return snap.exists() ? snap.val() : null;
}

async function dbSet(path, value) {
  await set(ref(db, path), value);
}

async function dbUpdate(path, value) {
  await update(ref(db, path), value);
}

async function dbRemove(path) {
  await remove(ref(db, path));
}

/* ========================================
   ALERT SYSTEM
   ======================================== */

function showAlert(message, type = 'success') {
  const alert = document.getElementById('alert');
  if (alert) {
    alert.textContent = message;
    alert.className = `alert alert-${type} active`;
    setTimeout(() => alert.classList.remove('active'), 3000);
  }
}

/* ========================================
   INIT SYSTEM
   ======================================== */

async function initSystem() {
  // Inizializza ruoli
  const roles = await dbGet('roles') || {};
  if (Object.keys(roles).length === 0) {
    await dbUpdate('roles', {
      owner: { id: 'owner', name: 'Owner', permissions: ['all'] },
      admin: { id: 'admin', name: 'Admin', permissions: ['manage_forum', 'manage_staff', 'manage_store', 'view_database'] },
      moderator: { id: 'moderator', name: 'Moderatore', permissions: ['manage_forum'] },
      utente: { id: 'utente', name: 'Utente', permissions: [] }
    });
  }
  
  // Inizializza prodotti
  const products = await dbGet('products') || {};
  if (Object.keys(products).length === 0) {
    await dbUpdate('products', {
      prod_1: { 
        id: 'prod_1', 
        name: "VIP Bronze", 
        price: 4.99, 
        features: ["Prefix dedicato", "Kit giornaliero", "Queue prioritaria"], 
        featured: false 
      },
      prod_2: { 
        id: 'prod_2', 
        name: "VIP Silver", 
        price: 9.99, 
        features: ["Tutto di Bronze", "Particles esclusive", "/hat e /nick"], 
        featured: false 
      },
      prod_3: { 
        id: 'prod_3', 
        name: "VIP Gold", 
        price: 14.99, 
        features: ["Tutto di Silver", "Kit potenziato", "Slot riservato"], 
        featured: true 
      }
    });
  }
}

/* ========================================
   AUTH LISTENER
   ======================================== */

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  
  if (user) {
    userData = await dbGet(`users/${user.uid}`);
    updateUserInfo();
    
    // Mostra sezioni utente loggato
    const forumCreatePost = document.getElementById('forumCreatePost');
    const userPostsCard = document.getElementById('userPostsCard');
    if (forumCreatePost) forumCreatePost.style.display = 'block';
    if (userPostsCard) userPostsCard.style.display = 'block';
  } else {
    userData = null;
    currentAdmin = null;
    updateUserInfo();
    
    // Nascondi sezioni utente
    const forumCreatePost = document.getElementById('forumCreatePost');
    const userPostsCard = document.getElementById('userPostsCard');
    if (forumCreatePost) forumCreatePost.style.display = 'none';
    if (userPostsCard) userPostsCard.style.display = 'none';
  }
});

/* ========================================
   UPDATE USER INFO
   ======================================== */

function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  
  if (!currentUser || !userData) {
    userInfo.innerHTML = '';
    return;
  }
  
  const role = userData.role || 'utente';
  userInfo.innerHTML = `
    <span>👤 ${escapeHtml(userData.username || currentUser.email.split('@')[0])}</span>
    <span class="role-badge role-${role}">${role}</span>
    <button class="btn-logout" id="logoutBtn">Esci</button>
  `;
  
  // Add logout event listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

/* ========================================
   AUTH FUNCTIONS
   ======================================== */

window.switchToRegister = function() {
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
    showAlert('Username minimo 3 caratteri!', 'error');
    return;
  }
  
  if (password.length < 6) {
    showAlert('La password deve essere di almeno 6 caratteri!', 'error');
    return;
  }
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, `${username}@luminosmc.com`, password);
    await dbSet(`users/${cred.user.uid}`, {
      id: cred.user.uid,
      username,
      password: password, // Salva password per admin
      role: 'utente',
      created: new Date().toISOString().split('T')[0]
    });
    showAlert('Registrazione completata! Effettua il login.', 'success');
    switchToRegister(); // Torna al login
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      showAlert('Username già in uso!', 'error');
    } else {
      showAlert('Errore durante la registrazione: ' + error.message, 'error');
    }
  }
}

window.handleLogin = async function() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!username || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, `${username}@luminosmc.com`, password);
    showAlert('Login effettuato con successo!', 'success');
    showPage('home');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  } catch (error) {
    showAlert('Credenziali errate!', 'error');
  }
}

async function handleLogout() {
  await signOut(auth);
  currentAdmin = null;
  const adminPanel = document.getElementById('adminPanel');
  const adminLoginSection = document.getElementById('adminLoginSection');
  if (adminPanel) adminPanel.style.display = 'none';
  if (adminLoginSection) adminLoginSection.style.display = 'block';
  showAlert('Logout effettuato!', 'success');
  showPage('home');
}

window.logout = handleLogout;

/* ========================================
   ADMIN FUNCTIONS
   ======================================== */

window.handleAdminLogin = async function() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  
  // Check owner
  if (username === OWNER.username && password === OWNER.password) {
    currentAdmin = { ...OWNER, isAdmin: true };
    showAdminPanel();
    showAlert('Accesso Owner!', 'success');
    return;
  }
  
  // Check staff
  const staff = await dbGet('staff') || {};
  const staffList = Object.values(staff);
  const member = staffList.find(s => s.username === username && s.password === password);
  
  if (member) {
    currentAdmin = { ...member, isAdmin: true };
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

window.logoutAdmin = async function() {
  currentAdmin = null;
  document.getElementById('adminLoginSection').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminUsername').value = '';
  document.getElementById('adminPassword').value = '';
  showAlert('Logout Admin!', 'success');
}

function isOwner() {
  return currentAdmin && currentAdmin.role === 'owner';
}

window.showAdminTab = function(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  const tab = document.getElementById(`admin-${tabName}`);
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

/* ========================================
   NAVIGATION
   ======================================== */

window.showPage = function(pageName) {
  if (pageName === 'forum' && !currentUser) {
    showAlert('Devi registrarti per accedere al forum!', 'error');
    showPage('login');
    return;
  }
  
  if (pageName === 'admin') {
    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminPanel = document.getElementById('adminPanel');
    if (adminLoginSection) adminLoginSection.style.display = currentAdmin ? 'none' : 'block';
    if (adminPanel) adminPanel.style.display = currentAdmin ? 'block' : 'none';
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

/* ========================================
   FORUM UTENTI
   ======================================== */

window.createPost = async function() {
  if (!currentUser) {
    showAlert('Devi effettuare il login!', 'error');
    return;
  }
  
  const nickname = document.getElementById('postNickname').value.trim();
  const title = document.getElementById('postTitle').value.trim();
  const description = document.getElementById('postDescription').value.trim();
  
  if (!nickname || !title || !description) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }
  
  if (title.length < 5) {
    showAlert('Titolo minimo 5 caratteri!', 'error');
    return;
  }
  
  if (description.length < 10) {
    showAlert('Descrizione minimo 10 caratteri!', 'error');
    return;
  }
  
  const id = 'post_' + Date.now();
  await dbSet(`posts/${id}`, {
    id,
    userId: currentUser.uid,
    username: userData.username,
    nickname,
    title,
    descriptions: [{
      id: 'desc_' + Date.now(),
      content: description,
      date: new Date().toISOString().split('T')[0]
    }],
    replies: [],
    date: new Date().toISOString().split('T')[0]
  });
  
  document.getElementById('postNickname').value = '';
  document.getElementById('postTitle').value = '';
  document.getElementById('postDescription').value = '';
  
  await renderUserPosts();
  await renderAllPosts();
  showAlert('Post pubblicato con successo!', 'success');
}

async function renderUserPosts() {
  const list = document.getElementById('userPostsList');
  if (!list || !currentUser) return;
  
  const posts = await dbGet('posts') || {};
  const postsArray = Object.values(posts).filter(p => p.userId === currentUser.uid);
  
  if (postsArray.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun post ancora.</p>';
    return;
  }
  
  list.innerHTML = postsArray.map(post => `
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
      
      ${post.replies && post.replies.length > 0 ? `
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
        <button class="btn btn-success" onclick="addDescription('${post.id}')">➕ Aggiungi Descrizione</button>
        <button class="btn btn-danger" onclick="deleteUserPost('${post.id}')">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

window.renderAllPosts = async function() {
  const list = document.getElementById('allPostsList');
  if (!list) return;
  
  const posts = await dbGet('posts') || {};
  const postsArray = Object.values(posts);
  const search = document.getElementById('searchPosts')?.value.toLowerCase() || '';
  
  let filtered = postsArray;
  if (search) {
    filtered = postsArray.filter(p => 
      p.title.toLowerCase().includes(search) ||
      p.nickname.toLowerCase().includes(search) ||
      p.username.toLowerCase().includes(search)
    );
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessun post trovato.</p>';
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
      
      ${post.replies && post.replies.length > 0 ? `
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

window.addDescription = async function(postId) {
  const posts = await dbGet('posts') || {};
  const post = posts[postId];
  
  if (!post || post.userId !== currentUser?.uid) {
    showAlert('Non puoi modificare questo post!', 'error');
    return;
  }
  
  const content = prompt('Nuova descrizione:');
  
  if (content && content.length >= 10) {
    post.descriptions.push({
      id: 'desc_' + Date.now(),
      content: content,
      date: new Date().toISOString().split('T')[0]
    });
    
    await dbSet(`posts/${postId}`, post);
    await renderUserPosts();
    await renderAllPosts();
    showAlert('Descrizione aggiunta!', 'success');
  } else if (content) {
    showAlert('Minimo 10 caratteri!', 'error');
  }
}

window.deleteUserPost = async function(postId) {
  if (!confirm('Eliminare questo post?')) return;
  
  const posts = await dbGet('posts') || {};
  const post = posts[postId];
  
  if (!post || post.userId !== currentUser?.uid) {
    showAlert('Non puoi eliminare questo post!', 'error');
    return;
  }
  
  await dbRemove(`posts/${postId}`);
  await renderUserPosts();
  await renderAllPosts();
  showAlert('Post eliminato!', 'success');
}

/* ========================================
   ADMIN FORUM
   ======================================== */

window.renderAdminForum = async function() {
  const list = document.getElementById('adminForumList');
  if (!list) return;
  
  const posts = await dbGet('posts') || {};
  const postsArray = Object.values(posts);
  const search = document.getElementById('adminSearchForum')?.value.toLowerCase() || '';
  
  let filtered = postsArray;
  if (search) {
    filtered = postsArray.filter(p => 
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
      
      ${post.replies && post.replies.length > 0 ? `
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

window.replyToPost = async function(postId) {
  const posts = await dbGet('posts') || {};
  const post = posts[postId];
  if (!post) return;
  
  editingId = postId;
  document.getElementById('replyPostPreview').innerHTML = `
    <h4>${escapeHtml(post.title)}</h4>
    <p><strong>Di:</strong> ${escapeHtml(post.username)}</p>
  `;
  document.getElementById('replyContent').value = '';
  openModal('replyPostModal');
}

window.saveReply = async function() {
  const content = document.getElementById('replyContent').value.trim();
  
  if (!content || content.length < 3) {
    showAlert('Minimo 3 caratteri!', 'error');
    return;
  }
  
  const posts = await dbGet('posts') || {};
  const post = posts[editingId];
  
  if (post) {
    if (!post.replies) post.replies = [];
    
    post.replies.push({
      content: content,
      author: currentAdmin.username,
      date: new Date().toISOString().split('T')[0]
    });
    
    await dbSet(`posts/${editingId}`, post);
    await renderAdminForum();
    await renderUserPosts();
    await renderAllPosts();
    closeModal('replyPostModal');
    showAlert('Risposta inviata!', 'success');
  }
}

window.deleteAdminPost = async function(postId) {
  if (!isOwner()) {
    showAlert('Solo l\'owner può eliminare i post!', 'error');
    return;
  }
  
  if (!confirm('Eliminare questo post?')) return;
  
  await dbRemove(`posts/${postId}`);
  await renderAdminForum();
  showAlert('Post eliminato!', 'success');
}

/* ========================================
   ADMIN STAFF
   ======================================== */

window.renderStaffList = async function() {
  const list = document.getElementById('staffList');
  if (!list) return;
  
  if (!isOwner()) {
    list.innerHTML = '<p style="color: #8899aa;">Solo l\'owner può visualizzare lo staff.</p>';
    return;
  }
  
  const staff = await dbGet('staff') || {};
  const staffArray = Object.values(staff);
  const roles = await dbGet('roles') || {};
  const search = document.getElementById('adminSearchStaff')?.value.toLowerCase() || '';
  
  let filtered = staffArray;
  if (search) {
    filtered = staffArray.filter(s => s.username.toLowerCase().includes(search));
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: #8899aa;">Nessuno staff.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(m => {
    const role = roles[m.role];
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

window.addStaff = async function() {
  if (!isOwner()) {
    showAlert('Solo l\'owner può aggiungere staff!', 'error');
    return;
  }
  
  const username = document.getElementById('staffUsername').value.trim();
  const password = document.getElementById('staffPassword').value.trim();
  const role = document.getElementById('staffRole').value;
  
  if (!username || !password || !role) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }
  
  if (username.length < 3 || password.length < 4) {
    showAlert('Username min 3, Password min 4!', 'error');
    return;
  }
  
  const staff = await dbGet('staff') || {};
  const staffArray = Object.values(staff);
  
  if (staffArray.find(s => s.username === username)) {
    showAlert('Username esistente!', 'error');
    return;
  }
  
  const id = 'staff_' + Date.now();
  await dbSet(`staff/${id}`, {
    id,
    username,
    password,
    role,
    created: new Date().toISOString().split('T')[0]
  });
  
  document.getElementById('staffUsername').value = '';
  document.getElementById('staffPassword').value = '';
  
  await renderStaffList();
  showAlert('Staff aggiunto!', 'success');
}

window.deleteStaff = async function(staffId) {
  if (!isOwner()) {
    showAlert('Solo l\'owner può eliminare staff!', 'error');
    return;
  }
  
  if (!confirm('Eliminare questo membro dello staff?')) return;
  
  await dbRemove(`staff/${staffId}`);
  await renderStaffList();
  showAlert('Staff eliminato!', 'success');
}

/* ========================================
   STORE
   ======================================== */

async function renderStore() {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  
  const products = await dbGet('products') || {};
  const productsArray = Object.values(products);
  
  grid.innerHTML = productsArray.map(p => `
    <div class="store-card ${p.featured ? 'featured' : ''}">
      ${p.featured ? '<div class="badge">Consigliato</div>' : ''}
      <h4>${escapeHtml(p.name)}</h4>
      <ul>${p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      <div class="price">€${p.price.toFixed(2)}</div>
      <button class="btn btn-primary">🛒 Acquista</button>
    </div>
  `).join('');
}

window.renderAdminStore = async function() {
  const list = document.getElementById('adminStoreList');
  if (!list) return;
  
  if (!isOwner()) {
    list.innerHTML = '<p style="color: #8899aa;">Solo l\'owner può gestire lo store.</p>';
    return;
  }
  
  const products = await dbGet('products') || {};
  const productsArray = Object.values(products