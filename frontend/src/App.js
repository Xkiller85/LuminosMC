import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './custom.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [forumUsers, setForumUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({});
  const [currentAdminTab, setCurrentAdminTab] = useState('overview');
  const wsRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket(`${WS_URL}/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (localStorage.getItem('token')) {
          connectWebSocket();
        }
      }, 3000);
    };
    
    wsRef.current = ws;
  };

  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message:', data);
    
    switch (data.type) {
      case 'post_created':
      case 'post_updated':
      case 'post_deleted':
      case 'reply_added':
        loadPosts();
        break;
      case 'product_created':
      case 'product_updated':
      case 'product_deleted':
        loadProducts();
        break;
      case 'user_registered':
      case 'user_deleted':
        loadForumUsers();
        break;
      case 'staff_created':
      case 'staff_updated':
      case 'staff_deleted':
        loadStaff();
        break;
      case 'role_created':
      case 'role_updated':
      case 'role_deleted':
        loadRoles();
        break;
      default:
        break;
    }
  };

  // Check for saved token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      const user = JSON.parse(userData);
      if (userType === 'admin') {
        setCurrentAdmin(user);
      } else {
        setCurrentUser(user);
      }
    }
    
    // Load initial data
    loadPosts();
    loadProducts();
    loadRoles();
  }, []);

  // Load data functions
  const loadPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await axios.get(`${API}/roles`);
      setRoles(response.data);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadForumUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/users/forum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForumUsers(response.data);
    } catch (error) {
      console.error('Error loading forum users:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaff(response.data);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Show alert
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Copy IP
  const copyIP = () => {
    navigator.clipboard.writeText('play.luminosmc.it');
    showAlert('IP copiato negli appunti!', 'success');
  };

  // Navigate pages
  const navigateTo = (page) => {
    if (page === 'forum' && !currentUser) {
      showAlert('Devi essere registrato per accedere al forum!', 'error');
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
  };

  // Render the app
  return (
    <div className="App">
      <Header
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        currentPage={currentPage}
        navigateTo={navigateTo}
        setCurrentUser={setCurrentUser}
        setCurrentAdmin={setCurrentAdmin}
        showAlert={showAlert}
        roles={roles}
      />
      
      {alert.show && (
        <div className="container">
          <div className={`alert alert-${alert.type} active`}>
            {alert.message}
          </div>
        </div>
      )}

      {currentPage === 'login' && (
        <LoginPage
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
          setCurrentUser={setCurrentUser}
          navigateTo={navigateTo}
          showAlert={showAlert}
          connectWebSocket={connectWebSocket}
        />
      )}

      {currentPage === 'home' && <HomePage copyIP={copyIP} />}

      {currentPage === 'store' && <StorePage products={products} />}

      {currentPage === 'forum' && (
        <ForumPage
          currentUser={currentUser}
          posts={posts}
          loadPosts={loadPosts}
          showAlert={showAlert}
          roles={roles}
        />
      )}

      {currentPage === 'admin' && (
        <AdminPage
          currentAdmin={currentAdmin}
          setCurrentAdmin={setCurrentAdmin}
          showAlert={showAlert}
          currentAdminTab={currentAdminTab}
          setCurrentAdminTab={setCurrentAdminTab}
          posts={posts}
          loadPosts={loadPosts}
          forumUsers={forumUsers}
          loadForumUsers={loadForumUsers}
          staff={staff}
          loadStaff={loadStaff}
          products={products}
          loadProducts={loadProducts}
          roles={roles}
          loadRoles={loadRoles}
          stats={stats}
          loadStats={loadStats}
          connectWebSocket={connectWebSocket}
        />
      )}

      {currentPage === 'roles' && (
        <RolesPage
          currentUser={currentUser}
          roles={roles}
          loadRoles={loadRoles}
          showAlert={showAlert}
        />
      )}

      <Footer />
    </div>
  );
}

// Components
function Header({ currentUser, currentAdmin, currentPage, navigateTo, setCurrentUser, setCurrentAdmin, showAlert, roles }) {
  const user = currentAdmin || currentUser;
  
  const hasPermission = (permission) => {
    if (!user || !user.roles) return false;
    const userRoles = roles.filter(r => user.roles.includes(r.id));
    return userRoles.some(role => role.permissions.includes(permission));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    setCurrentUser(null);
    setCurrentAdmin(null);
    navigateTo('home');
    showAlert('Logout effettuato con successo!', 'success');
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo" onClick={() => navigateTo('home')}>⚡ LuminosMC</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => navigateTo('home')}
            data-testid="nav-home-btn"
          >
            🏠 Home
          </button>
          <button
            className={`nav-btn ${currentPage === 'store' ? 'active' : ''}`}
            onClick={() => navigateTo('store')}
            data-testid="nav-store-btn"
          >
            🛒 Store
          </button>
          <button
            className={`nav-btn ${currentPage === 'forum' ? 'active' : ''}`}
            onClick={() => navigateTo('forum')}
            data-testid="nav-forum-btn"
          >
            💬 Forum
          </button>
          <button
            className={`nav-btn ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={() => navigateTo('admin')}
            data-testid="nav-admin-btn"
          >
            ⚡ Admin
          </button>
          {user && hasPermission('manage_roles') && (
            <button
              className={`nav-btn ${currentPage === 'roles' ? 'active' : ''}`}
              onClick={() => navigateTo('roles')}
              data-testid="nav-roles-btn"
            >
              🎭 Ruoli
            </button>
          )}
          {user && (
            <div className="user-info" data-testid="user-info">
              <span>👤 {user.username}</span>
              {user.roles && user.roles.map(roleId => {
                const role = roles.find(r => r.id === roleId);
                return role ? (
                  <span key={roleId} className={`role-badge role-${role.color}`}>
                    {role.name}
                  </span>
                ) : null;
              })}
              <button className="btn-logout" onClick={logout} data-testid="logout-btn">
                Esci
              </button>
            </div>
          )}
          {!user && (
            <button
              className="nav-btn"
              onClick={() => navigateTo('login')}
              data-testid="nav-login-btn"
            >
              🔐 Login
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function LoginPage({ isRegistering, setIsRegistering, setCurrentUser, navigateTo, showAlert, connectWebSocket }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      showAlert('Compila tutti i campi!', 'error');
      return;
    }

    try {
      if (isRegistering) {
        await axios.post(`${API}/auth/register`, { username, password });
        showAlert('Registrazione completata! Ora puoi accedere.', 'success');
        setIsRegistering(false);
        setPassword('');
      } else {
        const response = await axios.post(`${API}/auth/login`, { username, password });
        const { access_token, user } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('userType', 'user');
        localStorage.setItem('userData', JSON.stringify(user));
        
        setCurrentUser(user);
        showAlert('Login effettuato con successo!', 'success');
        navigateTo('home');
        connectWebSocket();
      }
    } catch (error) {
      const message = error.response?.data?.detail || (isRegistering ? 'Errore durante la registrazione' : 'Credenziali errate');
      showAlert(message, 'error');
    }
  };

  return (
    <div className="page active" data-testid="login-page">
      <div className="container">
        <div className="login-container">
          <div className="card login-card">
            <h2 data-testid="login-title">{isRegistering ? '📝 Registrazione' : '🔐 Login'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Inserisci username"
                  data-testid="login-username-input"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci password"
                  data-testid="login-password-input"
                />
              </div>
              <button type="submit" className="btn btn-primary" data-testid="login-submit-btn">
                {isRegistering ? 'Registrati' : 'Accedi'}
              </button>
            </form>
            <p className="hint">
              {isRegistering ? (
                <>
                  Hai già un account?{' '}
                  <a onClick={() => setIsRegistering(false)} data-testid="switch-to-login-link">
                    Accedi
                  </a>
                </>
              ) : (
                <>
                  Non hai un account?{' '}
                  <a onClick={() => setIsRegistering(true)} data-testid="switch-to-register-link">
                    Registrati
                  </a>
                </>
              )}
              <br />
              oppure{' '}
              <a onClick={() => navigateTo('home')} data-testid="back-to-home-link">
                torna alla home
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePage({ copyIP }) {
  return (
    <div className="page active" data-testid="home-page">
      <div className="container">
        <div className="hero">
          <h2>Benvenuto su LuminosMC</h2>
          <p><strong>LuminosMC</strong> ospita la <strong>Lifesteal più pericolosa d'Italia</strong>.</p>
          <p>Una modalità unica dove <strong>ogni vittoria ti regala un cuore ❤️</strong></p>
          <p>e <strong>ogni sconfitta te ne strappa uno 💔</strong>.</p>
          <p><em>Sopravvivi, combatti e diventa leggenda!</em></p>
          <button className="btn btn-primary" onClick={copyIP} data-testid="copy-ip-btn">
            📋 Copia IP del server
          </button>
        </div>

        <div className="card">
          <h3>Cosa troverai qui</h3>
          <ul className="features-list">
            <li><strong>Una Lifesteal pericolosa</strong> dove ogni cuore conta</li>
            <li><strong>VIP esclusivi</strong> con vantaggi unici e stile da veri boss</li>
            <li><strong>Una community stupenda</strong> pronta a combattere e collaborare</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StorePage({ products }) {
  return (
    <div className="page active" data-testid="store-page">
      <div className="container">
        <div className="hero">
          <h2>Store ufficiale</h2>
          <p>👑 Scegli il tuo <strong>VIP esclusivo</strong> e domina la Lifesteal.</p>
        </div>

        <div className="store-grid" data-testid="store-grid">
          {products.map(product => (
            <div key={product.id} className={`store-card ${product.featured ? 'featured' : ''}`} data-testid={`product-${product.id}`}>
              {product.featured && <div className="badge">Consigliato</div>}
              <h4>{product.name}</h4>
              <ul>
                {product.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
              <div className="price">€{product.price.toFixed(2)}</div>
              <button className="btn btn-primary">🛒 Acquista</button>
            </div>
          ))}
        </div>

        <div className="card">
          <p style={{ textAlign: 'center' }}>
            💡 I vantaggi sono cosmetici e di qualità di vita. Il gioco rimane <strong>fair</strong> per tutti.
          </p>
        </div>
      </div>
    </div>
  );
}

function ForumPage({ currentUser, posts, loadPosts, showAlert, roles }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const createPost = async (e) => {
    e.preventDefault();
    
    if (!title || !content) {
      showAlert('Compila tutti i campi!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/posts`,
        { title, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTitle('');
      setContent('');
      showAlert('Post pubblicato con successo!', 'success');
      loadPosts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la creazione del post';
      showAlert(message, 'error');
    }
  };

  const updatePost = async () => {
    if (!editingPost) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/posts/${editingPost.id}`,
        { title: editingPost.title, content: editingPost.content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditingPost(null);
      showAlert('Post modificato con successo!', 'success');
      loadPosts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la modifica del post';
      showAlert(message, 'error');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo post?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/posts/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert('Post eliminato con successo!', 'success');
      loadPosts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'eliminazione del post';
      showAlert(message, 'error');
    }
  };

  const addReply = async () => {
    if (!replyingTo || !replyContent) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/posts/${replyingTo.id}/replies`,
        { content: replyContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReplyingTo(null);
      setReplyContent('');
      showAlert('Risposta inviata con successo!', 'success');
      loadPosts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'invio della risposta';
      showAlert(message, 'error');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query) ||
      post.author.toLowerCase().includes(query)
    );
  });

  const userPosts = posts.filter(p => p.author === currentUser?.username);

  return (
    <div className="page active" data-testid="forum-page">
      <div className="container">
        <div className="hero">
          <h2>Forum della community</h2>
          <p>💬 Condividi idee, reporta bug e proponi eventi Lifesteal.</p>
        </div>

        <div className="card" data-testid="create-post-card">
          <h3>Crea un nuovo post</h3>
          <form onSubmit={createPost}>
            <div className="form-group">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo del post"
                maxLength="100"
                data-testid="post-title-input"
              />
              <small style={{ color: '#8899aa' }}>Min 5 caratteri, Max 100</small>
            </div>
            <div className="form-group">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Scrivi qui il contenuto..."
                maxLength="1000"
                data-testid="post-content-input"
              />
              <small style={{ color: '#8899aa' }}>Min 10 caratteri, Max 1000</small>
            </div>
            <button type="submit" className="btn btn-primary" data-testid="create-post-btn">
              ➕ Pubblica
            </button>
          </form>
        </div>

        <div className="card">
          <h3>I tuoi post</h3>
          <div data-testid="user-posts-list">
            {userPosts.length === 0 ? (
              <p style={{ color: '#8899aa' }}>Non hai ancora pubblicato nessun post.</p>
            ) : (
              userPosts.map(post => (
                <div key={post.id} className="post" data-testid={`user-post-${post.id}`}>
                  <h4>{post.title}</h4>
                  <p>{post.content}</p>
                  <div className="post-meta">Data: {post.date} | Risposte: {post.replies.length}</div>
                  {post.replies.length > 0 && (
                    <div className="post-replies">
                      <strong>Risposte ({post.replies.length}):</strong>
                      {post.replies.map((reply, idx) => (
                        <div key={idx} className="reply">
                          <p>{reply.content}</p>
                          <div className="reply-meta">Da: {reply.author} | {reply.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="post-actions">
                    <button
                      className="btn btn-warning"
                      onClick={() => setEditingPost({ ...post })}
                      data-testid={`edit-post-${post.id}-btn`}
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deletePost(post.id)}
                      data-testid={`delete-post-${post.id}-btn`}
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3>Tutti i post</h3>
          <div className="form-group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Cerca post per titolo, contenuto o autore..."
              data-testid="search-posts-input"
            />
          </div>
          <div data-testid="all-posts-list">
            {filteredPosts.length === 0 ? (
              <p style={{ color: '#8899aa' }}>Nessun post trovato.</p>
            ) : (
              filteredPosts.map(post => (
                <div key={post.id} className="post" data-testid={`post-${post.id}`}>
                  <h4>{post.title}</h4>
                  <p>{post.content}</p>
                  <div className="post-meta">
                    Autore: {post.author} | Data: {post.date} | Risposte: {post.replies.length}
                  </div>
                  {post.replies.length > 0 && (
                    <div className="post-replies">
                      <strong>Risposte ({post.replies.length}):</strong>
                      {post.replies.map((reply, idx) => (
                        <div key={idx} className="reply">
                          <p>{reply.content}</p>
                          <div className="reply-meta">Da: {reply.author} | {reply.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="post-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => setReplyingTo(post)}
                      data-testid={`reply-post-${post.id}-btn`}
                    >
                      💬 Rispondi
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="modal-overlay active" onClick={() => setEditingPost(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="edit-post-modal">
            <div className="modal-header">
              <h3>Modifica Post</h3>
              <button className="close-btn" onClick={() => setEditingPost(null)}>
                ×
              </button>
            </div>
            <div className="form-group">
              <label>Titolo</label>
              <input
                type="text"
                value={editingPost.title}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                data-testid="edit-post-title-input"
              />
            </div>
            <div className="form-group">
              <label>Contenuto</label>
              <textarea
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                data-testid="edit-post-content-input"
              />
            </div>
            <button className="btn btn-primary" onClick={updatePost} data-testid="save-edit-post-btn">
              💾 Salva
            </button>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyingTo && (
        <div className="modal-overlay active" onClick={() => setReplyingTo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="reply-post-modal">
            <div className="modal-header">
              <h3>Rispondi al Post</h3>
              <button className="close-btn" onClick={() => setReplyingTo(null)}>
                ×
              </button>
            </div>
            <div className="post-preview">
              <h4>{replyingTo.title}</h4>
              <p>{replyingTo.content}</p>
              <div className="reply-meta">Da: {replyingTo.author} | {replyingTo.date}</div>
            </div>
            <div className="form-group">
              <label>La tua risposta</label>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Scrivi la tua risposta..."
                data-testid="reply-content-input"
              />
            </div>
            <button className="btn btn-primary" onClick={addReply} data-testid="save-reply-btn">
              📤 Invia Risposta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Import AdminPage and other components from separate files for better organization
// For now, keeping them in the same file for simplicity

function AdminPage({
  currentAdmin,
  setCurrentAdmin,
  showAlert,
  currentAdminTab,
  setCurrentAdminTab,
  posts,
  loadPosts,
  forumUsers,
  loadForumUsers,
  staff,
  loadStaff,
  products,
  loadProducts,
  roles,
  loadRoles,
  stats,
  loadStats,
  connectWebSocket
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      showAlert('Compila tutti i campi!', 'error');
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/admin/login`, { username, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('userType', 'admin');
      localStorage.setItem('userData', JSON.stringify(user));
      
      setCurrentAdmin(user);
      showAlert('Accesso admin effettuato!', 'success');
      loadStats();
      loadPosts();
      loadForumUsers();
      loadStaff();
      loadRoles();
      connectWebSocket();
    } catch (error) {
      const message = error.response?.data?.detail || 'Credenziali admin errate';
      showAlert(message, 'error');
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    setCurrentAdmin(null);
    showAlert('Logout admin effettuato!', 'success');
  };

  if (!currentAdmin) {
    return (
      <div className="page active" data-testid="admin-login-page">
        <div className="container">
          <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3>🔐 Accesso Admin</h3>
            <p style={{ color: '#8899aa', marginBottom: '20px' }}>
              Inserisci le credenziali admin per accedere al pannello
            </p>
            <form onSubmit={handleAdminLogin}>
              <div className="form-group">
                <label>Username Admin</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  data-testid="admin-username-input"
                />
              </div>
              <div className="form-group">
                <label>Password Admin</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  data-testid="admin-password-input"
                />
              </div>
              <button type="submit" className="btn btn-primary" data-testid="admin-login-btn">
                Accedi al Pannello
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page active" data-testid="admin-panel">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#00f0ff' }}>Pannello Admin</h2>
          <button className="btn-logout" onClick={logoutAdmin} data-testid="admin-logout-btn">
            Esci Admin
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-btn ${currentAdminTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setCurrentAdminTab('overview'); loadStats(); }}
            data-testid="admin-tab-overview"
          >
            📊 Overview
          </button>
          <button
            className={`tab-btn ${currentAdminTab === 'posts' ? 'active' : ''}`}
            onClick={() => { setCurrentAdminTab('posts'); loadPosts(); }}
            data-testid="admin-tab-posts"
          >
            📝 Forum
          </button>
          <button
            className={`tab-btn ${currentAdminTab === 'staff' ? 'active' : ''}`}
            onClick={() => { setCurrentAdminTab('staff'); loadStaff(); }}
            data-testid="admin-tab-staff"
          >
            👥 Staff
          </button>
          <button
            className={`tab-btn ${currentAdminTab === 'products' ? 'active' : ''}`}
            onClick={() => { setCurrentAdminTab('products'); loadProducts(); }}
            data-testid="admin-tab-products"
          >
            🛒 Prodotti
          </button>
          <button
            className={`tab-btn ${currentAdminTab === 'users' ? 'active' : ''}`}
            onClick={() => { setCurrentAdminTab('users'); loadForumUsers(); }}
            data-testid="admin-tab-users"
          >
            👤 Database Utenti
          </button>
        </div>

        {currentAdminTab === 'overview' && (
          <OverviewTab stats={stats} />
        )}

        {currentAdminTab === 'posts' && (
          <PostsTab
            posts={posts}
            loadPosts={loadPosts}
            showAlert={showAlert}
            currentAdmin={currentAdmin}
          />
        )}

        {currentAdminTab === 'staff' && (
          <StaffTab
            staff={staff}
            loadStaff={loadStaff}
            roles={roles}
            showAlert={showAlert}
            currentAdmin={currentAdmin}
          />
        )}

        {currentAdminTab === 'products' && (
          <ProductsTab
            products={products}
            loadProducts={loadProducts}
            showAlert={showAlert}
            currentAdmin={currentAdmin}
          />
        )}

        {currentAdminTab === 'users' && (
          <UsersTab
            forumUsers={forumUsers}
            loadForumUsers={loadForumUsers}
            showAlert={showAlert}
            currentAdmin={currentAdmin}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ stats }) {
  return (
    <div className="admin-tab active" data-testid="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.posts || 0}</h3>
          <p>Post Totali</p>
        </div>
        <div className="stat-card">
          <h3>{stats.users || 0}</h3>
          <p>Utenti Forum</p>
        </div>
        <div className="stat-card">
          <h3>{stats.staff || 0}</h3>
          <p>Membri Staff</p>
        </div>
        <div className="stat-card">
          <h3>{stats.products || 0}</h3>
          <p>Prodotti Store</p>
        </div>
      </div>
    </div>
  );
}

function PostsTab({ posts, loadPosts, showAlert, currentAdmin }) {
  const [searchQuery, setSearchQuery] = useState('');

  const deletePost = async (postId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo post?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/posts/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert('Post eliminato con successo!', 'success');
      loadPosts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'eliminazione del post';
      showAlert(message, 'error');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.author.toLowerCase().includes(query)
    );
  });

  return (
    <div className="admin-tab active" data-testid="posts-tab">
      <div className="card">
        <h3>📝 Gestione Post</h3>
        <div className="form-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cerca post..."
            data-testid="admin-search-posts-input"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={loadPosts}
          style={{ marginBottom: '20px' }}
          data-testid="refresh-posts-btn"
        >
          🔄 Aggiorna Lista
        </button>
        <div data-testid="admin-posts-list">
          {filteredPosts.length === 0 ? (
            <p style={{ color: '#8899aa' }}>Nessun post trovato.</p>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} className="list-item" data-testid={`admin-post-${post.id}`}>
                <h4>{post.title}</h4>
                <div className="list-item-meta">Autore: {post.author}</div>
                <div className="list-item-meta">Data: {post.date}</div>
                <div className="list-item-meta">Risposte: {post.replies.length}</div>
                <div className="list-item-actions">
                  <button
                    className="btn btn-danger"
                    onClick={() => deletePost(post.id)}
                    data-testid={`admin-delete-post-${post.id}-btn`}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StaffTab({ staff, loadStaff, roles, showAlert, currentAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      setSelectedRole(roles[0].id);
    }
  }, [roles]);

  const createStaff = async (e) => {
    e.preventDefault();
    
    if (!username || !password || !selectedRole) {
      showAlert('Compila tutti i campi!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/staff`,
        { username, password, roles: [selectedRole] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsername('');
      setPassword('');
      showAlert('Staff aggiunto con successo!', 'success');
      loadStaff();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'aggiunta dello staff';
      showAlert(message, 'error');
    }
  };

  const updateStaff = async () => {
    if (!editingStaff) return;

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        username: editingStaff.username,
        roles: editingStaff.roles
      };
      
      if (editingStaff.newPassword) {
        updateData.password = editingStaff.newPassword;
      }

      await axios.put(
        `${API}/admin/staff/${editingStaff.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditingStaff(null);
      showAlert('Staff modificato con successo!', 'success');
      loadStaff();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la modifica dello staff';
      showAlert(message, 'error');
    }
  };

  const deleteStaff = async (staffId) => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo membro dello staff?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/admin/staff/${staffId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert('Staff rimosso con successo!', 'success');
      loadStaff();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la rimozione dello staff';
      showAlert(message, 'error');
    }
  };

  const filteredStaff = staff.filter(member => {
    if (!searchQuery) return true;
    return member.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="admin-tab active" data-testid="staff-tab">
      <div className="card">
        <h3>➕ Aggiungi Staff</h3>
        <form onSubmit={createStaff}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              data-testid="staff-username-input"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              data-testid="staff-password-input"
            />
          </div>
          <div className="form-group">
            <label>Ruolo</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              data-testid="staff-role-select"
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" data-testid="add-staff-btn">
            Aggiungi Staff
          </button>
        </form>
      </div>

      <div className="card">
        <h3>👥 Lista Staff</h3>
        <div className="form-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cerca staff..."
            data-testid="admin-search-staff-input"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={loadStaff}
          style={{ marginBottom: '20px' }}
          data-testid="refresh-staff-btn"
        >
          🔄 Aggiorna Lista
        </button>
        <div data-testid="staff-list">
          {filteredStaff.length === 0 ? (
            <p style={{ color: '#8899aa' }}>Nessuno staff trovato.</p>
          ) : (
            filteredStaff.map(member => {
              const memberRoles = roles.filter(r => member.roles.includes(r.id));
              return (
                <div key={member.id} className="list-item" data-testid={`staff-${member.id}`}>
                  <h4>{member.username}</h4>
                  <div className="list-item-meta">
                    Ruoli: {memberRoles.map(r => (
                      <span key={r.id} className={`role-badge role-${r.color}`}>{r.name}</span>
                    ))}
                  </div>
                  <div className="list-item-meta">Aggiunto il: {member.created}</div>
                  <div className="list-item-actions">
                    <button
                      className="btn btn-warning"
                      onClick={() => setEditingStaff({ ...member, newPassword: '' })}
                      data-testid={`edit-staff-${member.id}-btn`}
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteStaff(member.id)}
                      data-testid={`delete-staff-${member.id}-btn`}
                    >
                      🗑️ Rimuovi
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="modal-overlay active" onClick={() => setEditingStaff(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="edit-staff-modal">
            <div className="modal-header">
              <h3>Modifica Staff</h3>
              <button className="close-btn" onClick={() => setEditingStaff(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={editingStaff.username}
                onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                data-testid="edit-staff-username-input"
              />
            </div>
            <div className="form-group">
              <label>Password (lascia vuoto per non modificare)</label>
              <input
                type="password"
                value={editingStaff.newPassword}
                onChange={(e) => setEditingStaff({ ...editingStaff, newPassword: e.target.value })}
                placeholder="Nuova password"
                data-testid="edit-staff-password-input"
              />
            </div>
            <div className="form-group">
              <label>Ruolo</label>
              <select
                value={editingStaff.roles[0]}
                onChange={(e) => setEditingStaff({ ...editingStaff, roles: [e.target.value] })}
                data-testid="edit-staff-role-select"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={updateStaff} data-testid="save-edit-staff-btn">
              💾 Salva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsTab({ products, loadProducts, showAlert, currentAdmin }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState('');
  const [featured, setFeatured] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const createProduct = async (e) => {
    e.preventDefault();
    
    if (!name || !price || !features) {
      showAlert('Compila tutti i campi!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const featuresList = features.split('\n').filter(f => f.trim());
      
      await axios.post(
        `${API}/products`,
        { name, price: parseFloat(price), features: featuresList, featured },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setName('');
      setPrice('');
      setFeatures('');
      setFeatured(false);
      showAlert('Prodotto aggiunto con successo!', 'success');
      loadProducts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'aggiunta del prodotto';
      showAlert(message, 'error');
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/products/${editingProduct.id}`,
        {
          name: editingProduct.name,
          price: editingProduct.price,
          features: editingProduct.features,
          featured: editingProduct.featured
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditingProduct(null);
      showAlert('Prodotto modificato con successo!', 'success');
      loadProducts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la modifica del prodotto';
      showAlert(message, 'error');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/products/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert('Prodotto eliminato con successo!', 'success');
      loadProducts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'eliminazione del prodotto';
      showAlert(message, 'error');
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="admin-tab active" data-testid="products-tab">
      <div className="card">
        <h3>➕ Aggiungi Prodotto</h3>
        <form onSubmit={createProduct}>
          <div className="form-group">
            <label>Nome Prodotto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VIP Gold"
              data-testid="product-name-input"
            />
          </div>
          <div className="form-group">
            <label>Prezzo (€)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="14.99"
              step="0.01"
              data-testid="product-price-input"
            />
          </div>
          <div className="form-group">
            <label>Features (una per riga)</label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="Kit potenziato&#10;Slot riservato&#10;Particles esclusive"
              data-testid="product-features-input"
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                data-testid="product-featured-checkbox"
              />
              Prodotto in evidenza
            </label>
          </div>
          <button type="submit" className="btn btn-primary" data-testid="add-product-btn">
            Aggiungi Prodotto
          </button>
        </form>
      </div>

      <div className="card">
        <h3>🛒 Lista Prodotti</h3>
        <div className="form-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cerca prodotti..."
            data-testid="admin-search-products-input"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={loadProducts}
          style={{ marginBottom: '20px' }}
          data-testid="refresh-products-btn"
        >
          🔄 Aggiorna Lista
        </button>
        <div data-testid="products-list">
          {filteredProducts.length === 0 ? (
            <p style={{ color: '#8899aa' }}>Nessun prodotto trovato.</p>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="list-item" data-testid={`product-${product.id}`}>
                <h4>{product.name} {product.featured && '⭐'}</h4>
                <div className="list-item-meta">Prezzo: €{product.price.toFixed(2)}</div>
                <div className="list-item-meta">Features:</div>
                <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                  {product.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                <div className="list-item-actions">
                  <button
                    className="btn btn-warning"
                    onClick={() => setEditingProduct({ ...product })}
                    data-testid={`edit-product-${product.id}-btn`}
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteProduct(product.id)}
                    data-testid={`delete-product-${product.id}-btn`}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay active" onClick={() => setEditingProduct(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="edit-product-modal">
            <div className="modal-header">
              <h3>Modifica Prodotto</h3>
              <button className="close-btn" onClick={() => setEditingProduct(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Nome Prodotto</label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                data-testid="edit-product-name-input"
              />
            </div>
            <div className="form-group">
              <label>Prezzo (€)</label>
              <input
                type="number"
                value={editingProduct.price}
                onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                step="0.01"
                data-testid="edit-product-price-input"
              />
            </div>
            <div className="form-group">
              <label>Features (una per riga)</label>
              <textarea
                value={editingProduct.features.join('\n')}
                onChange={(e) => setEditingProduct({ ...editingProduct, features: e.target.value.split('\n').filter(f => f.trim()) })}
                data-testid="edit-product-features-input"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editingProduct.featured}
                  onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                  data-testid="edit-product-featured-checkbox"
                />
                Prodotto in evidenza
              </label>
            </div>
            <button className="btn btn-primary" onClick={updateProduct} data-testid="save-edit-product-btn">
              💾 Salva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ forumUsers, loadForumUsers, showAlert, currentAdmin }) {
  const [searchQuery, setSearchQuery] = useState('');

  const deleteUser = async (userId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/admin/users/forum/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert('Utente eliminato con successo!', 'success');
      loadForumUsers();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'eliminazione dell\'utente';
      showAlert(message, 'error');
    }
  };

  const filteredUsers = forumUsers.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.id.includes(query)
    );
  });

  return (
    <div className="admin-tab active" data-testid="users-tab">
      <div className="card">
        <h3>👤 Database Utenti Forum</h3>
        <p style={{ color: '#8899aa', marginBottom: '20px' }}>
          Gestisci tutti gli utenti registrati al forum
        </p>
        <div className="form-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cerca utenti..."
            data-testid="admin-search-users-input"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={loadForumUsers}
          style={{ marginBottom: '20px' }}
          data-testid="refresh-users-btn"
        >
          🔄 Aggiorna Lista
        </button>
        <div data-testid="users-list">
          {filteredUsers.length === 0 ? (
            <p style={{ color: '#8899aa' }}>Nessun utente trovato.</p>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="list-item" data-testid={`user-${user.id}`}>
                <h4>{user.username}</h4>
                <div className="list-item-meta">ID: {user.id}</div>
                <div className="list-item-meta">Registrato il: {user.created}</div>
                <div className="list-item-actions">
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteUser(user.id)}
                    data-testid={`delete-user-${user.id}-btn`}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RolesPage({ currentUser, roles, loadRoles, showAlert }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('admin');
  const [permissions, setPermissions] = useState([]);
  const [editingRole, setEditingRole] = useState(null);

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

  const togglePermission = (permId) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId));
    } else {
      setPermissions([...permissions, permId]);
    }
  };

  const createRole = async (e) => {
    e.preventDefault();
    
    if (!name) {
      showAlert('Inserisci un nome per il ruolo!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/roles`,
        { name, color, permissions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setName('');
      setPermissions([]);
      showAlert('Ruolo creato con successo!', 'success');
      loadRoles();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la creazione del ruolo';
      showAlert(message, 'error');
    }
  };

  const updateRole = async () => {
    if (!editingRole) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/roles/${editingRole.id}`,
        {
          name: editingRole.name,
          color: editingRole.color,
          permissions: editingRole.permissions
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditingRole(null);
      showAlert('Ruolo modificato con successo!', 'success');
      loadRoles();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante la modifica del ruolo';
      showAlert(message, 'error');
    }
  };

  const deleteRole = async (roleId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo ruolo?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/roles/${roleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert('Ruolo eliminato con successo!', 'success');
      loadRoles();
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore durante l\'eliminazione del ruolo';
      showAlert(message, 'error');
    }
  };

  return (
    <div className="page active" data-testid="roles-page">
      <div className="container">
        <div className="hero">
          <h2>🎭 Gestione Ruoli e Permessi</h2>
          <p>Crea e configura i ruoli con i loro permessi</p>
        </div>

        <div className="card">
          <h3>➕ Crea Nuovo Ruolo</h3>
          <form onSubmit={createRole}>
            <div className="form-group">
              <label>Nome Ruolo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Moderatore"
                data-testid="role-name-input"
              />
            </div>
            <div className="form-group">
              <label>Colore Badge</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                data-testid="role-color-select"
              >
                <option value="admin">Rosso (Admin)</option>
                <option value="moderator">Arancione (Moderatore)</option>
                <option value="helper">Cyan (Helper)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Permessi</label>
              <div data-testid="permissions-checkboxes">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <div key={perm.id} style={{ margin: '10px 0' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        data-testid={`permission-${perm.id}-checkbox`}
                      />
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" data-testid="create-role-btn">
              Crea Ruolo
            </button>
          </form>
        </div>

        <div className="card">
          <h3>🎭 Lista Ruoli</h3>
          <div data-testid="roles-list">
            {roles.length === 0 ? (
              <p style={{ color: '#8899aa' }}>Nessun ruolo trovato.</p>
            ) : (
              roles.map(role => {
                const permissionsLabels = role.permissions.map(permId => {
                  const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                  return perm ? perm.label : permId;
                }).join(', ');

                return (
                  <div key={role.id} className="list-item" data-testid={`role-${role.id}`}>
                    <h4>
                      <span className={`role-badge role-${role.color}`}>{role.name}</span>
                      {role.system && (
                        <span style={{ color: '#8899aa', fontSize: '0.8em' }}> (Sistema)</span>
                      )}
                    </h4>
                    <div className="list-item-meta">Permessi: {permissionsLabels || 'Nessuno'}</div>
                    {!role.system && (
                      <div className="list-item-actions">
                        <button
                          className="btn btn-warning"
                          onClick={() => setEditingRole({ ...role })}
                          data-testid={`edit-role-${role.id}-btn`}
                        >
                          ✏️ Modifica
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => deleteRole(role.id)}
                          data-testid={`delete-role-${role.id}-btn`}
                        >
                          🗑️ Elimina
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="modal-overlay active" onClick={() => setEditingRole(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="edit-role-modal">
            <div className="modal-header">
              <h3>Modifica Ruolo</h3>
              <button className="close-btn" onClick={() => setEditingRole(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Nome Ruolo</label>
              <input
                type="text"
                value={editingRole.name}
                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                data-testid="edit-role-name-input"
              />
            </div>
            <div className="form-group">
              <label>Colore Badge</label>
              <select
                value={editingRole.color}
                onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                data-testid="edit-role-color-select"
              >
                <option value="admin">Rosso (Admin)</option>
                <option value="moderator">Arancione (Moderatore)</option>
                <option value="helper">Cyan (Helper)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Permessi</label>
              <div>
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <div key={perm.id} style={{ margin: '10px 0' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={editingRole.permissions.includes(perm.id)}
                        onChange={() => {
                          const newPermissions = editingRole.permissions.includes(perm.id)
                            ? editingRole.permissions.filter(p => p !== perm.id)
                            : [...editingRole.permissions, perm.id];
                          setEditingRole({ ...editingRole, permissions: newPermissions });
                        }}
                      />
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={updateRole} data-testid="save-edit-role-btn">
              💾 Salva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>&copy; 2025 LuminosMC - Tutti i diritti riservati</p>
    </footer>
  );
}

export default App;
