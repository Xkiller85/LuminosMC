/* ========================================
   LUMINOS MC - SCRIPT.JS
   ======================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getDatabase, ref, child, get, set, update, remove
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
let isRegistering = false;
let adminMode = false;

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
    
    // Mostra pulsante admin se utente ha permessi
    const adminNavBtn = document.getElementById('adminNavBtn');
    const loginNavBtn = document.getElementById('loginNavBtn');
    if (adminNavBtn) adminNavBtn.style.display = 'block';
    if (loginNavBtn) loginNavBtn.style.display = 'none';
  } else {
    userData = null;
    adminMode = false;
    updateUserInfo();
    
    // Nascondi pulsante admin
    const adminNavBtn = document.getElementById('adminNavBtn');
    const loginNavBtn = document.getElementById('loginNavBtn');
    if (adminNavBtn) adminNavBtn.style.display = 'none';
    if (loginNavBtn) loginNavBtn.style.display = 'block';
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
    <span>👤 ${userData.username || currentUser.email.split('@')[0]}</span>
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

function toggleAuthMode() {
  isRegistering = !isRegistering;
  const title = document.getElementById('loginTitle');
  const hintText = document.getElementById('hintText');
  const form = document.getElementById('authForm');
  
  if (isRegistering) {
    title.textContent = '📝 Registrazione';
    hintText.textContent = 'Hai già un account?';
    form.querySelector('button').textContent = 'Registrati';
  } else {
    title.textContent = '🔐 Login';
    hintText.textContent = 'Non hai un account?';
    form.querySelector('button').textContent = 'Accedi';
  }
}

async function handleRegister(username, password) {
  if (password.length < 6) {
    showAlert('La password deve essere di almeno 6 caratteri!', 'error');
    return;
  }
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, `${username}@luminosmc.com`, password);
    await dbSet(`users/${cred.user.uid}`, {
      id: cred.user.uid,
      username,
      role: 'utente',
      created: new Date().toISOString().split('T')[0]
    });
    showAlert('Registrazione completata! Effettua il login.', 'success');
    toggleAuthMode(); // Torna al login
    // Reset form
    document.getElementById('authForm').reset();
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      showAlert('Username già in uso!', 'error');
    } else {
      showAlert('Errore durante la registrazione: ' + error.message, 'error');
    }
  }
}

async function handleLogin(username, password) {
  try {
    await signInWithEmailAndPassword(auth, `${username}@luminosmc.com`, password);
    showAlert('Login effettuato con successo!', 'success');
    showPage('home');
    // Reset form
    document.getElementById('authForm').reset();
  } catch (error) {
    showAlert('Credenziali errate!', 'error');
  }
}

async function handleLogout() {
  await signOut(auth);
  adminMode = false;
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminLoginSection').style.display = 'block';
  showAlert('Logout effettuato!', 'success');
  showPage('home');
}

/* ========================================
   ADMIN FUNCTIONS
   ======================================== */

async function handleAdminLogin() {
  if (!currentUser) {
    showAlert('Devi effettuare il login prima!', 'error');
    return;
  }
  
  const udata = await dbGet(`users/${currentUser.uid}`);
  if (udata && (udata.role === 'admin' || udata.role === 'owner')) {
    adminMode = true;
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    showAlert(`Accesso ${udata.role} autorizzato!`, 'success');
    await renderAdminContent();
  } else {
    showAlert('Non hai i permessi di amministratore!', 'error');
  }
}

async function renderAdminContent() {
  await renderAdminStore();
  await renderDatabase();
  await renderRolesList();
}

function showAdminTab(tabName) {
  // Rimuovi active da tutti i tab
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  // Attiva il tab selezionato
  const tab = document.getElementById(`admin-${tabName}`);
  if (tab) tab.classList.add('active');
  
  // Attiva il button
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
}

// Render admin store
async function renderAdminStore() {
  const list = document.getElementById('adminStoreList');
  if (!list) return;
  
  const products = await dbGet('products') || {};
  const arr = Object.values(products);
  
  list.innerHTML = arr.map(p => `
    <div class="admin-item">
      <h4 class="admin-item-title">${p.name}</h4>
      <p class="admin-item-meta">Prezzo: €${p.price.toFixed(2)}</p>
      <p class="admin-item-meta">Featured: ${p.featured ? 'Sì' : 'No'}</p>
      <p class="admin-item-meta">Features: ${p.features.join(', ')}</p>
    </div>
  `).join('');
}

// Render database utenti
async function renderDatabase() {
  const list = document.getElementById('databaseList');
  if (!list) return;
  
  const users = await dbGet('users') || {};
  const roles = await dbGet('roles') || {};
  const arr = Object.values(users);
  
  list.innerHTML = arr.map(u => `
    <div class="admin-item">
      <h4 class="admin-item-title">${u.username}</h4>
      <p class="admin-item-meta">Ruolo: ${roles[u.role]?.name || u.role}</p>
      <p class="admin-item-meta">Registrato: ${u.created}</p>
      <div class="admin-item-actions">
        <button class="btn btn-warning" data-user-id="${u.id}" data-action="change-role">🔄 Cambia Ruolo</button>
        <button class="btn btn-danger" data-user-id="${u.id}" data-action="delete">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  list.querySelectorAll('[data-action="change-role"]').forEach(btn => {
    btn.addEventListener('click', () => changeUserRole(btn.getAttribute('data-user-id')));
  });
  
  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-user-id')));
  });
}

async function changeUserRole(userId) {
  const roles = await dbGet('roles') || {};
  const roleId = prompt(`Nuovo ruolo:\n${Object.keys(roles).join(', ')}`);
  
  if (roleId && roles[roleId]) {
    await dbUpdate(`users/${userId}`, { role: roleId });
    await renderDatabase();
    showAlert('Ruolo cambiato con successo!', 'success');
  } else if (roleId) {
    showAlert('Ruolo non valido!', 'error');
  }
}

async function deleteUser(userId) {
  if (confirm('Sei sicuro di voler eliminare questo utente?')) {
    await dbRemove(`users/${userId}`);
    await renderDatabase();
    showAlert('Utente eliminato!', 'success');
  }
}

// Render ruoli
async function renderRolesList() {
  const list = document.getElementById('rolesList');
  if (!list) return;
  
  const roles = await dbGet('roles') || {};
  
  list.innerHTML = Object.values(roles).map(r => `
    <div class="admin-item">
      <h4 class="admin-item-title">${r.name}</h4>
      <p class="admin-item-meta">ID: ${r.id}</p>
      <p class="admin-item-meta">Permessi: ${(r.permissions || []).join(', ')}</p>
    </div>
  `).join('');
}

/* ========================================
   STORE
   ======================================== */

async function renderStore() {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  
  const products = await dbGet('products') || {};
  const arr = Object.values(products);
  
  grid.innerHTML = arr.map(p => `
    <div class="store-card ${p.featured ? 'featured' : ''}">
      ${p.featured ? '<div class="badge">⭐ Consigliato</div>' : ''}
      <h3>${p.name}</h3>
      <div class="price">€${p.price.toFixed(2)}</div>
      <ul>
        ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
      </ul>
      <button class="btn btn-primary">🛒 Acquista Ora</button>
    </div>
  `).join('');
}

/* ========================================
   FORUM
   ======================================== */

async function createPost() {
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
  
  const id = 'post_' + Date.now();
  await dbSet(`posts/${id}`, {
    id,
    userId: currentUser.uid,
    username: userData?.username || currentUser.email.split('@')[0],
    nickname,
    title,
    description,
    date: new Date().toISOString().split('T')[0]
  });
  
  showAlert('Post pubblicato con successo!', 'success');
  
  // Reset form
  document.getElementById('postNickname').value = '';
  document.getElementById('postTitle').value = '';
  document.getElementById('postDescription').value = '';
  
  await renderForumPosts();
}

async function renderForumPosts() {
  const container = document.getElementById('forumPosts');
  if (!container) return;
  
  const posts = await dbGet('posts') || {};
  const arr = Object.values(posts).sort((a, b) => b.id.localeCompare(a.id));
  
  if (arr.length === 0) {
    container.innerHTML = '<p style="color: #8899aa; text-align: center; padding: 20px;">Nessun post ancora. Sii il primo a pubblicare!</p>';
    return;
  }
  
  container.innerHTML = arr.map(p => `
    <div class="admin-item">
      <h4 class="admin-item-title">${p.title}</h4>
      <p class="admin-item-meta">Di: ${p.nickname} (@${p.username}) - ${p.date}</p>
      <p style="color: #b0c4de; margin-top: 10px;">${p.description}</p>
    </div>
  `).join('');
}

/* ========================================
   NAVIGATION
   ======================================== */

function showPage(pageName) {
  // Rimuovi active da tutte le pagine e nav buttons
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  // Attiva la pagina selezionata
  const page = document.getElementById(pageName);
  if (page) page.classList.add('active');
  
  // Attiva il nav button corrispondente
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-page') === pageName) {
      btn.classList.add('active');
    }
  });
  
  // Carica contenuto specifico
  if (pageName === 'store') {
    renderStore();
  } else if (pageName === 'forum') {
    renderForumPosts();
  }
}

/* ========================================
   EVENT LISTENERS
   ======================================== */

document.addEventListener('DOMContentLoaded', async function() {
  await initSystem();
  await renderStore();
  await renderForumPosts();
  
  // Logo click
  const logoBtn = document.getElementById('logoBtn');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => showPage('home'));
  }
  
  // Navigation buttons
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      if (page) showPage(page);
    });
  });
  
  // Auth form
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('authUsername').value.trim();
      const password = document.getElementById('authPassword').value;
      
      if (!username || !password) {
        showAlert('Compila tutti i campi!', 'error');
        return;
      }
      
      if (isRegistering) {
        await handleRegister(username, password);
      } else {
        await handleLogin(username, password);
      }
    });
  }
  
  // Toggle auth mode
  const toggleAuthBtn = document.getElementById('toggleAuthBtn');
  if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener('click', toggleAuthMode);
  }
  
  // Admin login
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', handleAdminLogin);
  }
  
  // Create post
  const createPostBtn = document.getElementById('createPostBtn');
  if (createPostBtn) {
    createPostBtn.addEventListener('click', createPost);
  }
  
  // Admin tabs
  const adminTabs = document.getElementById('adminTabs');
  if (adminTabs) {
    adminTabs.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        const tabName = e.target.getAttribute('data-tab');
        if (tabName) showAdminTab(tabName);
      }
    });
  }
});