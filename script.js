/* ========================================
   LUMINOS MC - SCRIPT.JS
   Firebase Integration with Dynamic Roles System
   ======================================== */

// Firebase SDK v9+ Modular Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAp3juPC1YnzBbTWdK0qtGEdj8UcRwpjUA",
  authDomain: "luminosmc-4ee70.firebaseapp.com",
  projectId: "luminosmc-4ee70",
  storageBucket: "luminosmc-4ee70.firebasestorage.app",
  messagingSenderId: "125483937552",
  appId: "1:125483937552:web:ea9264b2da064b7ed3ff95",
  measurementId: "G-0Q8THWCHXY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global State
let currentUser = null;
let currentUserData = null;
let currentUserRole = null;
let allRoles = [];
let editingId = null;
let editingUserId = null;

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  // Setup auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData(user.uid);
      updateUserInfo();
      setupRealtimeListeners();
    } else {
      currentUser = null;
      currentUserData = null;
      currentUserRole = null;
      updateUserInfo();
    }
  });

  // Close modal on outside click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
});

/* ========================================
   AUTHENTICATION
   ======================================== */

window.toggleAuthMode = function() {
  const loginSection = document.getElementById('loginSection');
  const registerSection = document.getElementById('registerSection');
  
  if (loginSection.style.display === 'none') {
    loginSection.style.display = 'block';
    registerSection.style.display = 'none';
  } else {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  }
};

window.handleRegister = async function() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!username || !email || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('La password deve essere almeno di 6 caratteri!', 'error');
    return;
  }

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Check if this is the first user (will be owner)
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const isFirstUser = usersSnapshot.empty;

    // Assign role: first user becomes owner, others get default role
    let assignedRole = 'user';
    if (isFirstUser) {
      assignedRole = 'owner';
      // Create owner role if not exists
      await ensureOwnerRoleExists();
    }

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      username: username,
      role: assignedRole,
      createdAt: serverTimestamp()
    });

    showAlert(`Registrazione completata! ${isFirstUser ? 'Sei stato assegnato come OWNER.' : ''} Controlla la tua email per verificare l'account.`, 'success');
    
    // Clear form
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    
    // Switch to login
    toggleAuthMode();
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      showAlert('Questa email è già registrata!', 'error');
    } else {
      showAlert('Errore durante la registrazione: ' + error.message, 'error');
    }
  }
};

window.handleLogin = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showAlert('Login effettuato con successo!', 'success');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    showPage('home');
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      showAlert('Email o password errati!', 'error');
    } else {
      showAlert('Errore durante il login: ' + error.message, 'error');
    }
  }
};

window.logout = async function() {
  try {
    await signOut(auth);
    showAlert('Logout effettuato con successo!', 'success');
    showPage('home');
  } catch (error) {
    console.error('Logout error:', error);
    showAlert('Errore durante il logout', 'error');
  }
};

async function loadUserData(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      currentUserData = { id: uid, ...userDoc.data() };
      
      // Load user's role with permissions
      if (currentUserData.role) {
        const roleDoc = await getDoc(doc(db, 'roles', currentUserData.role));
        if (roleDoc.exists()) {
          currentUserRole = { id: roleDoc.id, ...roleDoc.data() };
        }
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  const adminBtn = document.getElementById('adminBtn');
  const createPostSection = document.getElementById('createPostSection');
  const myPostsSection = document.getElementById('myPostsSection');

  if (currentUser && currentUserData) {
    userInfo.innerHTML = `
      <span>👤 ${currentUserData.username}</span>
      <button class="btn-logout" onclick="logout()">Esci</button>
    `;
    
    // Show admin button if user has permission
    if (currentUserRole && currentUserRole.permissions && currentUserRole.permissions.accessAdminPanel) {
      adminBtn.style.display = 'inline-block';
    } else {
      adminBtn.style.display = 'none';
    }

    // Show create post section
    if (createPostSection) createPostSection.style.display = 'block';
    if (myPostsSection) myPostsSection.style.display = 'block';
  } else {
    userInfo.innerHTML = `
      <button class="nav-btn" onclick="showPage('auth')">🔐 Login</button>
    `;
    adminBtn.style.display = 'none';
    if (createPostSection) createPostSection.style.display = 'none';
    if (myPostsSection) myPostsSection.style.display = 'none';
  }
}

async function ensureOwnerRoleExists() {
  try {
    const ownerRoleDoc = await getDoc(doc(db, 'roles', 'owner'));
    if (!ownerRoleDoc.exists()) {
      await setDoc(doc(db, 'roles', 'owner'), {
        name: 'Owner',
        permissions: {
          accessAdminPanel: true,
          manageStore: true,
          manageForum: true,
          manageUsers: true,
          manageRoles: true
        }
      });
    }
  } catch (error) {
    console.error('Error creating owner role:', error);
  }
}

function hasPermission(permission) {
  if (!currentUserRole || !currentUserRole.permissions) return false;
  return currentUserRole.permissions[permission] === true;
}

function isOwner() {
  return currentUserData && currentUserData.role === 'owner';
}

/* ========================================
   PAGE NAVIGATION
   ======================================== */

window.showPage = function(pageName) {
  // Check admin access
  if (pageName === 'admin') {
    if (!currentUser || !hasPermission('accessAdminPanel')) {
      showAlert('Accesso negato! Non hai i permessi per accedere al pannello admin.', 'error');
      return;
    }
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

  if (pageName === 'admin') {
    loadAllRoles();
    updateStats();
  }
};

/* ========================================
   ADMIN TABS
   ======================================== */

window.showAdminTab = function(tabName) {
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

  // Load content based on tab
  if (tabName === 'rolesTab') {
    loadAllRoles();
    renderRolesList();
  } else if (tabName === 'usersTab') {
    renderUsersList();
  } else if (tabName === 'postsTab') {
    renderAdminPosts();
  } else if (tabName === 'productsTab') {
    renderProductsList();
  }
};

/* ========================================
   ROLES MANAGEMENT (OWNER ONLY)
   ======================================== */

async function loadAllRoles() {
  try {
    const rolesSnapshot = await getDocs(collection(db, 'roles'));
    allRoles = [];
    rolesSnapshot.forEach((doc) => {
      allRoles.push({ id: doc.id, ...doc.data() });
    });
  } catch (error) {
    console.error('Error loading roles:', error);
  }
}

window.createRole = async function() {
  if (!isOwner()) {
    showAlert('Solo l\'owner può creare nuovi ruoli!', 'error');
    return;
  }

  const roleName = document.getElementById('roleName').value.trim();
  const permissions = {
    accessAdminPanel: document.getElementById('permAccessAdmin').checked,
    manageStore: document.getElementById('permManageStore').checked,
    manageForum: document.getElementById('permManageForum').checked,
    manageUsers: document.getElementById('permManageUsers').checked
  };

  if (!roleName) {
    showAlert('Inserisci un nome per il ruolo!', 'error');
    return;
  }

  try {
    const roleId = roleName.toLowerCase().replace(/\s+/g, '_');
    await setDoc(doc(db, 'roles', roleId), {
      name: roleName,
      permissions: permissions
    });

    showAlert('Ruolo creato con successo!', 'success');
    
    // Clear form
    document.getElementById('roleName').value = '';
    document.getElementById('permAccessAdmin').checked = false;
    document.getElementById('permManageStore').checked = false;
    document.getElementById('permManageForum').checked = false;
    document.getElementById('permManageUsers').checked = false;

    await loadAllRoles();
    renderRolesList();
  } catch (error) {
    console.error('Error creating role:', error);
    showAlert('Errore durante la creazione del ruolo', 'error');
  }
};

async function renderRolesList() {
  const rolesList = document.getElementById('rolesList');
  if (!rolesList) return;

  await loadAllRoles();

  if (allRoles.length === 0) {
    rolesList.innerHTML = '<p style="color: #8899aa;">Nessun ruolo presente.</p>';
    return;
  }

  rolesList.innerHTML = allRoles.map(role => `
    <div class="list-item">
      <h4>${role.name} ${role.id === 'owner' ? '👑' : ''}</h4>
      <div class="list-item-meta">
        <strong>Permessi:</strong><br>
        ${role.permissions.accessAdminPanel ? '<span class="permission-badge">Pannello Admin</span>' : ''}
        ${role.permissions.manageStore ? '<span class="permission-badge">Gestione Store</span>' : ''}
        ${role.permissions.manageForum ? '<span class="permission-badge">Gestione Forum</span>' : ''}
        ${role.permissions.manageUsers ? '<span class="permission-badge">Gestione Utenti</span>' : ''}
        ${!role.permissions.accessAdminPanel && !role.permissions.manageStore && !role.permissions.manageForum && !role.permissions.manageUsers ? '<span style="color: #8899aa;">Nessun permesso</span>' : ''}
      </div>
      ${isOwner() && role.id !== 'owner' ? `
        <div class="list-item-actions">
          <button class="btn btn-warning" onclick="editRole('${role.id}')">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="deleteRole('${role.id}')">🗑️ Elimina</button>
        </div>
      ` : role.id === 'owner' ? '<div class="list-item-meta" style="color: #00ff64;">⚠️ Il ruolo Owner non può essere modificato o eliminato</div>' : ''}
    </div>
  `).join('');
}

window.editRole = async function(roleId) {
  if (!isOwner()) {
    showAlert('Solo l\'owner può modificare i ruoli!', 'error');
    return;
  }

  try {
    const roleDoc = await getDoc(doc(db, 'roles', roleId));
    if (!roleDoc.exists()) return;

    const role = roleDoc.data();
    editingId = roleId;

    document.getElementById('editRoleName').value = role.name;
    document.getElementById('editPermAccessAdmin').checked = role.permissions.accessAdminPanel || false;
    document.getElementById('editPermManageStore').checked = role.permissions.manageStore || false;
    document.getElementById('editPermManageForum').checked = role.permissions.manageForum || false;
    document.getElementById('editPermManageUsers').checked = role.permissions.manageUsers || false;

    openModal('editRoleModal');
  } catch (error) {
    console.error('Error loading role:', error);
    showAlert('Errore durante il caricamento del ruolo', 'error');
  }
};

window.saveEditRole = async function() {
  if (!isOwner()) {
    showAlert('Solo l\'owner può modificare i ruoli!', 'error');
    return;
  }

  const roleName = document.getElementById('editRoleName').value.trim();
  const permissions = {
    accessAdminPanel: document.getElementById('editPermAccessAdmin').checked,
    manageStore: document.getElementById('editPermManageStore').checked,
    manageForum: document.getElementById('editPermManageForum').checked,
    manageUsers: document.getElementById('editPermManageUsers').checked
  };

  if (!roleName) {
    showAlert('Inserisci un nome per il ruolo!', 'error');
    return;
  }

  try {
    await updateDoc(doc(db, 'roles', editingId), {
      name: roleName,
      permissions: permissions
    });

    showAlert('Ruolo modificato con successo!', 'success');
    closeModal('editRoleModal');
    await loadAllRoles();
    renderRolesList();
  } catch (error) {
    console.error('Error updating role:', error);
    showAlert('Errore durante la modifica del ruolo', 'error');
  }
};

window.deleteRole = async function(roleId) {
  if (!isOwner()) {
    showAlert('Solo l\'owner può eliminare i ruoli!', 'error');
    return;
  }

  if (roleId === 'owner') {
    showAlert('Non puoi eliminare il ruolo Owner!', 'error');
    return;
  }

  if (!confirm('Sei sicuro di voler eliminare questo ruolo?')) {
    return;
  }

  try {
    // Check if any user has this role
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let hasUsers = false;
    usersSnapshot.forEach((doc) => {
      if (doc.data().role === roleId) {
        hasUsers = true;
      }
    });

    if (hasUsers) {
      showAlert('Non puoi eliminare questo ruolo perché è assegnato ad alcuni utenti!', 'error');
      return;
    }

    await deleteDoc(doc(db, 'roles', roleId));
    showAlert('Ruolo eliminato con successo!', 'success');
    await loadAllRoles();
    renderRolesList();
  } catch (error) {
    console.error('Error deleting role:', error);
    showAlert('Errore durante l\'eliminazione del ruolo', 'error');
  }
};

/* ========================================
   USERS MANAGEMENT
   ======================================== */

async function renderUsersList() {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;

  if (!hasPermission('manageUsers')) {
    usersList.innerHTML = '<p style="color: #ff3366;">Non hai i permessi per gestire gli utenti.</p>';
    return;
  }

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    if (users.length === 0) {
      usersList.innerHTML = '<p style="color: #8899aa;">Nessun utente presente.</p>';
      return;
    }

    usersList.innerHTML = users.map(user => `
      <div class="list-item">
        <h4>${user.username} ${user.role === 'owner' ? '👑' : ''}</h4>
        <div class="list-item-meta">Email: ${user.email}</div>
        <div class="list-item-meta">
          Ruolo: <span class="role-badge">${user.role}</span>
        </div>
        <div class="list-item-meta">Registrato: ${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
        ${isOwner() && user.id !== currentUser.uid ? `
          <div class="list-item-actions">
            <button class="btn btn-primary" onclick="openAssignRoleModal('${user.id}')">🔄 Cambia Ruolo</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading users:', error);
    usersList.innerHTML = '<p style="color: #ff3366;">Errore durante il caricamento degli utenti.</p>';
  }
}

window.openAssignRoleModal = async function(userId) {
  if (!isOwner()) {
    showAlert('Solo l\'owner può modificare i ruoli degli utenti!', 'error');
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return;

    const user = userDoc.data();
    editingUserId = userId;

    document.getElementById('assignRoleUserInfo').innerHTML = `
      <p><strong>Utente:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Ruolo attuale:</strong> <span class="role-badge">${user.role}</span></p>
    `;

    // Load roles into select
    await loadAllRoles();
    const select = document.getElementById('assignRoleSelect');
    select.innerHTML = allRoles.map(role => `
      <option value="${role.id}" ${role.id === user.role ? 'selected' : ''}>${role.name}</option>
    `).join('');

    openModal('assignRoleModal');
  } catch (error) {
    console.error('Error loading user:', error);
    showAlert('Errore durante il caricamento dell\'utente', 'error');
  }
};

window.saveAssignRole = async function() {
  if (!isOwner()) {
    showAlert('Solo l\'owner può modificare i ruoli degli utenti!', 'error');
    return;
  }

  const newRole = document.getElementById('assignRoleSelect').value;

  if (!newRole) {
    showAlert('Seleziona un ruolo!', 'error');
    return;
  }

  try {
    await updateDoc(doc(db, 'users', editingUserId), {
      role: newRole
    });

    showAlert('Ruolo aggiornato con successo!', 'success');
    closeModal('assignRoleModal');
    renderUsersList();
  } catch (error) {
    console.error('Error updating user role:', error);
    showAlert('Errore durante l\'aggiornamento del ruolo', 'error');
  }
};

/* ========================================
   POSTS MANAGEMENT
   ======================================== */

function setupRealtimeListeners() {
  // Listen to posts changes
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  onSnapshot(postsQuery, (snapshot) => {
    renderAllPosts();
    renderUserPosts();
    if (hasPermission('manageForum')) {
      renderAdminPosts();
    }
  });

  // Listen to products changes
  const productsQuery = query(collection(db, 'products'));
  onSnapshot(productsQuery, (snapshot) => {
    renderStore();
    if (hasPermission('manageStore')) {
      renderProductsList();
    }
  });
}

async function renderAllPosts() {
  const allPostsList = document.getElementById('allPostsList');
  if (!allPostsList) return;

  try {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const postsSnapshot = await getDocs(postsQuery);
    const posts = [];
    postsSnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });

    if (posts.length === 0) {
      allPostsList.innerHTML = '<p style="color: #8899aa;">Nessun post presente.</p>';
      return;
    }

    allPostsList.innerHTML = posts.map(post => `
      <div class="post">
        <h4>${post.title}</h4>
        <p>${post.content}</p>
        <div class="post-meta">Autore: ${post.authorName} | Data: ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
        ${post.replies && post.replies.length > 0 ? `
          <div class="post-replies">
            <strong>Risposte (${post.replies.length}):</strong>
            ${post.replies.map(reply => `
              <div class="reply">
                <p>${reply.content}</p>
                <div class="reply-meta">Da: ${reply.authorName} | ${reply.createdAt ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

async function renderUserPosts() {
  const userPostsList = document.getElementById('userPostsList');
  if (!userPostsList || !currentUser) return;

  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    const userPosts = [];
    postsSnapshot.forEach((doc) => {
      const post = doc.data();
      if (post.authorId === currentUser.uid) {
        userPosts.push({ id: doc.id, ...post });
      }
    });

    if (userPosts.length === 0) {
      userPostsList.innerHTML = '<p style="color: #8899aa;">Non hai ancora pubblicato nessun post.</p>';
      return;
    }

    userPostsList.innerHTML = userPosts.map(post => `
      <div class="post">
        <h4>${post.title}</h4>
        <p>${post.content}</p>
        <div class="post-meta">Data: ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
        ${post.replies && post.replies.length > 0 ? `
          <div class="post-replies">
            <strong>Risposte (${post.replies.length}):</strong>
            ${post.replies.map(reply => `
              <div class="reply">
                <p>${reply.content}</p>
                <div class="reply-meta">Da: ${reply.authorName} | ${reply.createdAt ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
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
  } catch (error) {
    console.error('Error loading user posts:', error);
  }
}

window.createPost = async function() {
  if (!currentUser) {
    showAlert('Devi essere loggato per creare un post!', 'error');
    return;
  }

  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();

  if (!title || !content) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  try {
    await addDoc(collection(db, 'posts'), {
      title: title,
      content: content,
      authorId: currentUser.uid,
      authorName: currentUserData.username,
      createdAt: serverTimestamp(),
      replies: []
    });

    showAlert('Post pubblicato con successo!', 'success');
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
  } catch (error) {
    console.error('Error creating post:', error);
    showAlert('Errore durante la pubblicazione del post', 'error');
  }
};

window.editUserPost = async function(postId) {
  try {
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) return;

    const post = postDoc.data();
    
    if (post.authorId !== currentUser.uid) {
      showAlert('Non puoi modificare questo post!', 'error');
      return;
    }

    editingId = postId;
    document.getElementById('editPostTitle').value = post.title;
    document.getElementById('editPostContent').value = post.content;
    openModal('editPostModal');
  } catch (error) {
    console.error('Error loading post:', error);
  }
};

window.deleteUserPost = async function(postId) {
  try {
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) return;

    const post = postDoc.data();
    
    if (post.authorId !== currentUser.uid) {
      showAlert('Non puoi eliminare questo post!', 'error');
      return;
    }

    if (!confirm('Sei sicuro di voler eliminare questo post?')) return;

    await deleteDoc(doc(db, 'posts', postId));
    showAlert('Post eliminato con successo!', 'success');
  } catch (error) {
    console.error('Error deleting post:', error);
    showAlert('Errore durante l\'eliminazione del post', 'error');
  }
};

window.saveEditPost = async function() {
  const title = document.getElementById('editPostTitle').value.trim();
  const content = document.getElementById('editPostContent').value.trim();

  if (!title || !content) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  try {
    await updateDoc(doc(db, 'posts', editingId), {
      title: title,
      content: content
    });

    showAlert('Post modificato con successo!', 'success');
    closeModal('editPostModal');
  } catch (error) {
    console.error('Error updating post:', error);
    showAlert('Errore durante la modifica del post', 'error');
  }
};

/* ========================================
   ADMIN POSTS MANAGEMENT
   ======================================== */

async function renderAdminPosts() {
  const adminPostsList = document.getElementById('adminPostsList');
  if (!adminPostsList) return;

  if (!hasPermission('manageForum')) {
    adminPostsList.innerHTML = '<p style="color: #ff3366;">Non hai i permessi per gestire il forum.</p>';
    return;
  }

  try {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const postsSnapshot = await getDocs(postsQuery);
    const posts = [];
    postsSnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });

    if (posts.length === 0) {
      adminPostsList.innerHTML = '<p style="color: #8899aa;">Nessun post presente.</p>';
      return;
    }

    adminPostsList.innerHTML = posts.map(post => `
      <div class="post">
        <h4>${post.title}</h4>
        <p>${post.content}</p>
        <div class="post-meta">Autore: ${post.authorName} | Data: ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
        ${post.replies && post.replies.length > 0 ? `
          <div class="post-replies">
            <strong>Risposte (${post.replies.length}):</strong>
            ${post.replies.map(reply => `
              <div class="reply">
                <p>${reply.content}</p>
                <div class="reply-meta">Da: ${reply.authorName} | ${reply.createdAt ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div class="post-actions">
          <button class="btn btn-success" onclick="replyToPost('${post.id}')">💬 Rispondi</button>
          <button class="btn btn-danger" onclick="deleteAdminPost('${post.id}')">🗑️ Elimina</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

window.replyToPost = async function(postId) {
  if (!hasPermission('manageForum')) {
    showAlert('Non hai i permessi per rispondere ai post!', 'error');
    return;
  }

  try {
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) return;

    const post = postDoc.data();
    editingId = postId;

    document.getElementById('replyPostPreview').innerHTML = `
      <h4>${post.title}</h4>
      <p>${post.content}</p>
      <div class="reply-meta">Da: ${post.authorName} | ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}</div>
    `;
    document.getElementById('replyContent').value = '';
    openModal('replyPostModal');
  } catch (error) {
    console.error('Error loading post:', error);
  }
};

window.saveReply = async function() {
  const content = document.getElementById('replyContent').value.trim();

  if (!content) {
    showAlert('Scrivi una risposta!', 'error');
    return;
  }

  try {
    const postDoc = await getDoc(doc(db, 'posts', editingId));
    if (!postDoc.exists()) return;

    const post = postDoc.data();
    const replies = post.replies || [];
    
    replies.push({
      content: content,
      authorName: currentUserData.username,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'posts', editingId), {
      replies: replies
    });

    showAlert('Risposta inviata con successo!', 'success');
    closeModal('replyPostModal');
  } catch (error) {
    console.error('Error saving reply:', error);
    showAlert('Errore durante l\'invio della risposta', 'error');
  }
};

window.deleteAdminPost = async function(postId) {
  if (!hasPermission('manageForum')) {
    showAlert('Non hai i permessi per eliminare i post!', 'error');
    return;
  }

  if (!confirm('Sei sicuro di voler eliminare questo post?')) return;

  try {
    await deleteDoc(doc(db, 'posts', postId));
    showAlert('Post eliminato con successo!', 'success');
  } catch (error) {
    console.error('Error deleting post:', error);
    showAlert('Errore durante l\'eliminazione del post', 'error');
  }
};

/* ========================================
   PRODUCTS MANAGEMENT
   ======================================== */

async function renderStore() {
  const storeGrid = document.getElementById('storeGrid');
  if (!storeGrid) return;

  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = [];
    productsSnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    if (products.length === 0) {
      storeGrid.innerHTML = '<p style="color: #8899aa;">Nessun prodotto disponibile.</p>';
      return;
    }

    storeGrid.innerHTML = products.map(product => `
      <div class="store-card ${product.featured ? 'featured' : ''}">
        ${product.featured ? '<div class="badge">Consigliato</div>' : ''}
        <h4>${product.name}</h4>
        <ul>
          ${product.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <div class="price">€${product.price.toFixed(2)}</div>
        <button class="btn btn-primary">🛒 Acquista</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function renderProductsList() {
  const productsList = document.getElementById('productsList');
  if (!productsList) return;

  if (!hasPermission('manageStore')) {
    productsList.innerHTML = '<p style="color: #ff3366;">Non hai i permessi per gestire lo store.</p>';
    return;
  }

  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = [];
    productsSnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    if (products.length === 0) {
      productsList.innerHTML = '<p style="color: #8899aa;">Nessun prodotto presente.</p>';
      return;
    }

    productsList.innerHTML = products.map(product => `
      <div class="list-item">
        <h4>${product.name} ${product.featured ? '⭐' : ''}</h4>
        <div class="list-item-meta">Prezzo: €${product.price.toFixed(2)}</div>
        <div class="list-item-meta">Features:</div>
        <ul style="margin-left: 20px; margin-top: 5px;">
          ${product.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <div class="list-item-actions">
          <button class="btn btn-warning" onclick="editProduct('${product.id}')">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">🗑️ Elimina</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

window.addProduct = async function() {
  if (!hasPermission('manageStore')) {
    showAlert('Non hai i permessi per gestire lo store!', 'error');
    return;
  }

  const name = document.getElementById('productName').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const featuresText = document.getElementById('productFeatures').value.trim();
  const featured = document.getElementById('productFeatured').checked;

  if (!name || !price || !featuresText) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const features = featuresText.split('\n').filter(f => f.trim());

  try {
    await addDoc(collection(db, 'products'), {
      name: name,
      price: price,
      features: features,
      featured: featured
    });

    showAlert('Prodotto aggiunto con successo!', 'success');
    
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productFeatures').value = '';
    document.getElementById('productFeatured').checked = false;
  } catch (error) {
    console.error('Error adding product:', error);
    showAlert('Errore durante l\'aggiunta del prodotto', 'error');
  }
};

window.editProduct = async function(productId) {
  if (!hasPermission('manageStore')) {
    showAlert('Non hai i permessi per gestire lo store!', 'error');
    return;
  }

  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) return;

    const product = productDoc.data();
    editingId = productId;

    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductFeatures').value = product.features.join('\n');
    document.getElementById('editProductFeatured').checked = product.featured;

    openModal('editProductModal');
  } catch (error) {
    console.error('Error loading product:', error);
  }
};

window.saveEditProduct = async function() {
  const name = document.getElementById('editProductName').value.trim();
  const price = parseFloat(document.getElementById('editProductPrice').value);
  const featuresText = document.getElementById('editProductFeatures').value.trim();
  const featured = document.getElementById('editProductFeatured').checked;

  if (!name || !price || !featuresText) {
    showAlert('Compila tutti i campi!', 'error');
    return;
  }

  const features = featuresText.split('\n').filter(f => f.trim());

  try {
    await updateDoc(doc(db, 'products', editingId), {
      name: name,
      price: price,
      features: features,
      featured: featured
    });

    showAlert('Prodotto modificato con successo!', 'success');
    closeModal('editProductModal');
  } catch (error) {
    console.error('Error updating product:', error);
    showAlert('Errore durante la modifica del prodotto', 'error');
  }
};

window.deleteProduct = async function(productId) {
  if (!hasPermission('manageStore')) {
    showAlert('Non hai i permessi per gestire lo store!', 'error');
    return;
  }

  if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

  try {
    await deleteDoc(doc(db, 'products', productId));
    showAlert('Prodotto eliminato con successo!', 'success');
  } catch (error) {
    console.error('Error deleting product:', error);
    showAlert('Errore durante l\'eliminazione del prodotto', 'error');
  }
};

/* ========================================
   STATS
   ======================================== */

async function updateStats() {
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const productsSnapshot = await getDocs(collection(db, 'products'));

    const totalPostsEl = document.getElementById('totalPosts');
    const totalUsersEl = document.getElementById('totalUsers');
    const totalProductsEl = document.getElementById('totalProducts');

    if (totalPostsEl) totalPostsEl.textContent = postsSnapshot.size;
    if (totalUsersEl) totalUsersEl.textContent = usersSnapshot.size;
    if (totalProductsEl) totalProductsEl.textContent = productsSnapshot.size;
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

window.copyIP = function() {
  navigator.clipboard.writeText('play.luminosmc.it');
  showAlert('IP copiato negli appunti!', 'success');
};

window.showAlert = function(message, type = 'success') {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert alert-${type} active`;
  setTimeout(() => alert.classList.remove('active'), 4000);
};

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
  editingId = null;
  editingUserId = null;
};
