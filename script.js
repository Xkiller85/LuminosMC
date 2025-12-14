/* ========================================
   LUMINOS MC - SISTEMA COMPLETO
   Firebase Authentication + Realtime Database
   ======================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getDatabase, ref, child, get, set, update, remove
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* CONFIG FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyAp3juPC1YnzBbTWdK0qtGEdj8UcRwpjUA",
  authDomain: "luminosmc-4ee70.firebaseapp.com",
  projectId: "luminosmc-4ee70",
  storageBucket: "luminosmc-4ee70.firebasestorage.app",
  messagingSenderId: "125483937552",
  appId: "1:125483937552:web:ea9264b2da064b7ed3ff95",
  measurementId: "G-0Q8THWCHXY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/* VARIABILI */
let currentUser = null;
let currentAdmin = null;
let editingId = null;
let isRegistering = false;

/* HELPERS DB */
async function dbGet(path) {
  const snap = await get(child(ref(db), path));
  return snap.exists() ? snap.val() : null;
}
async function dbSet(path, value) { await set(ref(db, path), value); }
async function dbUpdate(path, value) { await update(ref(db, path), value); }
async function dbRemove(path) { await remove(ref(db, path)); }

/* ALERT */
function showAlert(msg, type = 'success') {
  const alert = document.getElementById('alert');
  if (alert) {
    alert.textContent = msg;
    alert.className = `alert alert-${type} active`;
    setTimeout(() => alert.classList.remove('active'), 3000);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

/* INIT */
document.addEventListener('DOMContentLoaded', async function() {
  await initSystem();
  await renderStore();
  populateRoleSelects();
});

/* Inizializza ruoli e prodotti se vuoti */
async function initSystem() {
  const roles = await dbGet('roles') || {};
  if (Object.keys(roles).length === 0) {
    await dbUpdate('roles', {
      owner: { id: 'owner', name: 'Owner', permissions: ['all'] },
      admin: { id: 'admin', name: 'Admin', permissions: ['manage_forum','manage_staff','manage_store','view_database'] },
      moderator: { id: 'moderator', name: 'Moderatore', permissions: ['manage_forum'] },
      utente: { id: 'utente', name: 'Utente', permissions: [] }
    });
  }
  const products = await dbGet('products') || {};
  if (Object.keys(products).length === 0) {
    await dbUpdate('products', {
      prod_1: { id: 'prod_1', name: "VIP Bronze", price: 4.99, features: ["Prefix dedicato","Kit giornaliero","Queue prioritaria"], featured: false },
      prod_2: { id: 'prod_2', name: "VIP Silver", price: 9.99, features: ["Tutto di Bronze","Particles esclusive","/hat e /nick"], featured: false },
      prod_3: { id: 'prod_3', name: "VIP Gold", price: 14.99, features: ["Tutto di Silver","Kit potenziato","Slot riservato"], featured: true }
    });
  }
}

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  updateUserInfo();
});

/* Registrazione */
async function handleRegister() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) return showAlert('Compila tutti i campi!', 'error');

  const cred = await createUserWithEmailAndPassword(auth, `${username}@luminosmc.com`, password);
  const uid = cred.user.uid;
  await dbSet(`users/${uid}`, {
    id: uid,
    username,
    role: 'utente',
    created: new Date().toISOString().split('T')[0]
  });
  showAlert('Registrato! Accedi ora.', 'success');
}

/* Login */
async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    await signInWithEmailAndPassword(auth, `${username}@luminosmc.com`, password);
    showAlert('Login OK!', 'success');
    updateUserInfo();
    showPage('home');
  } catch (e) {
    showAlert('Credenziali errate!', 'error');
  }
}

/* Logout */
async function logout() {
  await signOut(auth);
  currentUser = null;
  updateUserInfo();
  showPage('home');
  showAlert('Logout!', 'success');
}

/* Aggiorna info utente */
async function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  if (!currentUser) {
    if (userInfo) userInfo.innerHTML = '';
    return;
  }
  const udata = await dbGet(`users/${currentUser.uid}`);
  const role = udata?.role || 'utente';
  if (userInfo) {
    userInfo.innerHTML = `
      <span>👤 ${udata?.username || currentUser.email.split('@')[0]}</span>
      <span class="role-badge role-${role}">${role}</span>
      <button class="btn-logout btn" onclick="logout()">Esci</button>
    `;
  }
}

/* Admin login = basato su ruolo */
async function handleAdminLogin() {
  if (!currentUser) return showAlert('Devi fare login come utente!', 'error');
  const udata = await dbGet(`users/${currentUser.uid}`);
  if (udata && (udata.role === 'admin' || udata.role === 'owner')) {
    currentAdmin = { ...udata, isAdmin: true };
    showAdminPanel();
    showAlert(`Accesso ${udata.role}!`, 'success');
  } else {
    showAlert('Non sei admin!', 'error');
  }
}

function showAdminPanel() {
  document.getElementById('adminLoginSection').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
}

async function logoutAdmin() {
  currentAdmin = null;
  document.getElementById('adminLoginSection').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  showAlert('Logout Admin!', 'success');
}

function isOwner() {
  return currentAdmin && currentAdmin.role === 'owner';
}

/* Forum */
async function createPost() {
  if (!currentUser) return showAlert('Loggati!', 'error');
  const nickname = document.getElementById('postNickname').value.trim();
  const title = document.getElementById('postTitle').value.trim();
  const description = document.getElementById('postDescription').value.trim();
  if (!nickname || !title || !description) return showAlert('Compila tutto!', 'error');

  const id = 'post_' + Date.now();
  await dbSet(`posts/${id}`, {
    id,
    userId: currentUser.uid,
    username: (await dbGet(`users/${currentUser.uid}`))?.username,
    nickname,
    title,
    descriptions: [{ id: 'desc_' + Date.now(), content: description, date: new Date().toISOString().split('T')[0] }],
    replies: [],
    date: new Date().toISOString().split('T')[0]
  });
  showAlert('Post pubblicato!', 'success');
}

/* Risposta admin */
async function replyToPost(postId, content) {
  const post = await dbGet(`posts/${postId}`);
  if (!post) return;
  const updatedReplies = [...(post.replies || []), {
    content,
    author: currentAdmin?.username || 'Admin',
    date: new Date().toISOString().split('T')[0]
  }];
  await dbUpdate(`posts/${postId}`, { replies: updatedReplies });
  showAlert('Risposta inviata!', 'success');
}

/* Staff */
async function addStaff(username, role) {
  const id = 'staff_' + Date.now();
  await dbSet(`staff/${id}`, { id, username, role, created: new Date().toISOString().split('T')[0] });
  showAlert('Staff aggiunto!', 'success');
}
async function deleteStaff(staffId) {
  await dbRemove(`staff/${staffId}`);
  showAlert('Staff eliminato!', 'success');
}

/* Prodotti */
async function addProduct(name, price, features, featured) {
  const id = 'prod_' + Date.now();
  await dbSet(`products/${id}`, { id, name, price, features, featured });
  showAlert('Prodotto aggiunto!', 'success');
}
async function deleteProduct(productId) {
  await dbRemove(`products/${productId}`);
  showAlert('Prodotto eliminato!', 'success');
}

/* Store */
async function renderStore() {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  const products = await dbGet('products') || {};
  const arr = Object.values(products);
  grid.innerHTML = arr.map(p => `
    <div class="store-card ${p.featured ? 'featured' : ''}">
      ${p.featured ? '<div class="badge">Consigliato</div>' : ''}
      <h4>${p.name}</h4>
      <ul>${(p.features||[]).map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="price">€${Number(p.price).toFixed(2)}</div>
      <button class="btn btn-primary">🛒 Acquista</button>
    </div>
  `).join('');
}

/* Database Utenti */
async function renderDatabase() {
  const list = document.getElementById('databaseList');
  if (!list) return;
  const users = await dbGet('users') || {};
  const roles = await dbGet('roles') || {};
  const arr = Object.values(users);
  list.innerHTML = arr.map(u => `
    <div class="list-item">
      <h4>${u.username}</h4>
      <div class="list-item-meta">Ruolo: ${roles[u.role]?.name || u.role}</div>
      <div class="list-item-meta">Registrato: ${u.created}</div>
      <div class="list-item-actions">
        <button class="btn btn-warning" onclick="changeUserRole('${u.id}')">🔄 Cambia Ruolo</button>
        <button class="btn btn-danger" onclick="deleteUser('${u.id}')">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

async function changeUserRole(userId) {
  const roles = await dbGet('roles') || {};
  const roleId = prompt(`Nuovo ruolo:\n${Object.keys(roles).join(', ')}`);
  if (roleId && roles[roleId]) {
    await dbUpdate(`users/${userId}`, { role: roleId });
    await renderDatabase();
    showAlert('Ruolo cambiato!', 'success');
  }
}

async function deleteUser(userId) {
  await dbRemove(`users/${userId}`);
  await renderDatabase();
  showAlert('Utente eliminato!', 'success');
}

/* Ruoli */
async function renderRolesList() {
  const list = document.getElementById('rolesList');
  if (!list) return;
  const roles = await dbGet('roles') || {};
  list.innerHTML = Object.values(roles).map(r => `
    <div class="list-item">
      <h4>${r.name}</h4>
      <div class="list-item-meta">ID: ${r.id}</div>
      <div class="list-item-meta">Permessi: ${(r.permissions||[]).join(', ')}</div>
      <div class="list-item-actions">
        <button class="btn btn-warning" onclick="editRole('${r.id}')">✏️ Modifica</button>
        ${r.id !== 'owner' && r.id !== 'utente' ? `<button class="btn btn-danger" onclick="deleteRole('${r.id}')">🗑️ Elimina</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function addRole(id, name, permissions) {
  await dbUpdate(`roles`, { [id]: { id, name, permissions } });
  await renderRolesList();
  showAlert('Ruolo creato!', 'success');
}

async function editRole(roleId) {
  const roles = await dbGet('roles') || {};
  const role = roles[roleId];
  if (!role) return;
  const perms = prompt(`Permessi per ${role.name}:`, (role.permissions||[]).join(', '));
  if (perms !== null) {
    await dbUpdate(`roles/${roleId}`, { permissions: perms.split(',').map(p => p.trim()) });
    await renderRolesList();
    showAlert('Ruolo modificato!', 'success');
  }
}

async function deleteRole(roleId) {
  if (roleId === 'owner' || roleId === 'utente') return showAlert('Non puoi eliminare questo ruolo!', 'error');
  await dbRemove(`roles/${roleId}`);
  await renderRolesList();
  showAlert('Ruolo eliminato!', 'success');
}

async function populateRoleSelects() {
  const roles = await dbGet('roles') || {};
  const staffRole = document.getElementById('staffRole');
  if (staffRole) {
    staffRole.innerHTML = Object.values(roles)
      .filter(r => r.id !== 'owner' && r.id !== 'utente')
      .map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  }
}

/* Navigation */
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageName);
  if (page) page.classList.add('active');
  if (pageName === 'store') renderStore();
  if (pageName === 'admin' && currentAdmin) renderAdminContent();
}

async function renderAdminContent() {
  await renderStore();
  await renderDatabase();
  await renderRolesList();
}

/* Espone funzioni al window */
window.showPage = showPage;
window.showAdminTab = showAdminTab;

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.switchToRegister = switchToRegister;

window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;

window.createPost = createPost;
window.replyToPost = replyToPost;

window.addStaff = addStaff;
window.deleteStaff = deleteStaff;

window.addProduct = addProduct;
window.deleteProduct = deleteProduct;

window.changeUserRole = changeUserRole;
window.deleteUser = deleteUser;

window.addRole = addRole;
window.editRole = editRole;
window.deleteRole = deleteRole;

window.renderAllPosts = renderAllPosts; // se usi la ricerca forum