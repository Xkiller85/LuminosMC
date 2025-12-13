# LuminosMC Forum - Applicazione Completa

Applicazione forum per server Minecraft con database MongoDB, autenticazione JWT e aggiornamenti real-time via WebSocket.

## 🚀 Funzionalità

### Forum
- ✅ Database MongoDB per post e risposte
- ✅ Creazione, modifica ed eliminazione post
- ✅ Sistema di risposte ai post
- ✅ Ricerca e filtri
- ✅ Persistenza dati dopo refresh

### Autenticazione
- ✅ Registrazione e login utenti
- ✅ Password hashate con bcrypt
- ✅ JWT con sessioni persistenti (7 giorni)
- ✅ Login separato per admin
- ✅ Gestione completa ruoli e permessi

### Store
- ✅ Database MongoDB per prodotti VIP
- ✅ CRUD completo (creazione, modifica, eliminazione)
- ✅ Prodotti in evidenza
- ✅ Gestione features per prodotto

### Admin Panel
- ✅ Gestione post forum
- ✅ Gestione staff con ruoli
- ✅ Gestione prodotti store
- ✅ Visualizzazione tutti gli utenti
- ✅ Gestione ruoli personalizzati
- ✅ Statistiche in tempo reale
- ✅ Tasti di refresh per ogni sezione

### Real-Time Updates
- ✅ WebSocket per aggiornamenti istantanei
- ✅ Notifiche per nuovi post, utenti, prodotti
- ✅ Auto-reconnect automatico

## 📦 Struttura del Progetto

```
luminosmc-forum/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variables template
└── frontend/
    ├── src/
    │   ├── App.js        # React application
    │   ├── App.css       # Styles
    │   └── index.js      # Entry point
    ├── package.json      # Node dependencies
    └── .env.example      # Environment variables template
```

## 🛠️ Installazione

### Backend (FastAPI + MongoDB)

1. **Installa le dipendenze:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configura le variabili d'ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Modifica `.env`:
   ```env
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="luminosmc_db"
   CORS_ORIGINS="*"
   JWT_SECRET_KEY="your-secret-key-here"
   ```

3. **Avvia MongoDB:**
   ```bash
   # Con Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # O installazione locale
   sudo systemctl start mongodb
   ```

4. **Avvia il server:**
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

### Frontend (React)

1. **Installa le dipendenze:**
   ```bash
   cd frontend
   yarn install
   # o
   npm install
   ```

2. **Configura le variabili d'ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Modifica `.env`:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

3. **Avvia l'applicazione:**
   ```bash
   yarn start
   # o
   npm start
   ```

L'applicazione sarà disponibile su `http://localhost:3000`

## 🔑 Credenziali di Default

### Admin/Owner
- **Username:** TheMarck_MC
- **Password:** 1234

⚠️ **IMPORTANTE:** Cambia le credenziali admin in produzione!

## 📊 Database

### Collections MongoDB

- **users** - Utenti forum (username, password hashata, data registrazione)
- **admin_users** - Staff e admin (username, password, ruoli)
- **posts** - Post del forum (titolo, contenuto, autore, risposte)
- **products** - Prodotti dello store (nome, prezzo, features)
- **roles** - Ruoli personalizzati (nome, colore, permessi)

### Dati di Esempio

Al primo avvio, vengono creati automaticamente:
- 1 account Owner (TheMarck_MC)
- 4 ruoli di sistema (Owner, Admin, Moderator, Helper)
- 4 prodotti VIP (Bronze, Silver, Gold, Legend)

## 🔒 Sicurezza

- ✅ Password hashate con bcrypt
- ✅ JWT per autenticazione
- ✅ Token con scadenza (7 giorni)
- ✅ Validazione input con Pydantic
- ✅ CORS configurabile
- ✅ Sistema di permessi granulare

## 🌐 API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/login` - Login utente
- `POST /api/auth/admin/login` - Login admin
- `GET /api/auth/me` - Info utente corrente
- `POST /api/auth/change-password` - Cambio password

### Forum
- `GET /api/posts` - Lista post
- `POST /api/posts` - Crea post
- `PUT /api/posts/{id}` - Modifica post
- `DELETE /api/posts/{id}` - Elimina post
- `POST /api/posts/{id}/replies` - Aggiungi risposta

### Store
- `GET /api/products` - Lista prodotti
- `POST /api/products` - Crea prodotto (admin)
- `PUT /api/products/{id}` - Modifica prodotto (admin)
- `DELETE /api/products/{id}` - Elimina prodotto (admin)

### Admin
- `GET /api/admin/users/forum` - Lista utenti forum
- `DELETE /api/admin/users/forum/{id}` - Elimina utente
- `GET /api/admin/staff` - Lista staff
- `POST /api/admin/staff` - Aggiungi staff
- `PUT /api/admin/staff/{id}` - Modifica staff
- `DELETE /api/admin/staff/{id}` - Rimuovi staff
- `GET /api/admin/stats` - Statistiche

### Ruoli
- `GET /api/roles` - Lista ruoli
- `POST /api/roles` - Crea ruolo (owner)
- `PUT /api/roles/{id}` - Modifica ruolo (owner)
- `DELETE /api/roles/{id}` - Elimina ruolo (owner)

### WebSocket
- `WS /ws` - Connessione WebSocket per aggiornamenti real-time

## 🎨 Personalizzazione

### Colori e Stile
Modifica `/frontend/src/App.css` per personalizzare:
- Colori tema (cyan #00f0ff di default)
- Gradients
- Spacing
- Typography

### Ruoli e Permessi
Crea ruoli personalizzati dal pannello admin con permessi:
- `manage_posts` - Gestire post
- `manage_staff` - Gestire staff
- `manage_products` - Gestire prodotti
- `manage_roles` - Gestire ruoli
- `view_admin` - Accesso admin panel
- `delete_any_post` - Eliminare qualsiasi post
- `edit_any_post` - Modificare qualsiasi post
- `manage_users` - Gestire database utenti

## 🐛 Troubleshooting

### Backend non si avvia
- Verifica che MongoDB sia in esecuzione
- Controlla le variabili d'ambiente in `.env`
- Verifica che la porta 8001 sia libera

### Frontend non si connette al backend
- Verifica che `REACT_APP_BACKEND_URL` in `.env` sia corretto
- Controlla che il backend sia in esecuzione
- Verifica i log della console browser (F12)

### WebSocket non funziona
- Verifica che il backend supporti WebSocket (uvicorn lo fa di default)
- Controlla la configurazione CORS
- Verifica che non ci siano proxy che bloccano WebSocket

## 📝 Note di Sviluppo

- Il backend usa **FastAPI** con **Motor** (driver async MongoDB)
- Il frontend è una **React SPA** (Single Page Application)
- Le sessioni persistono in **localStorage** (JWT)
- Il database è **MongoDB** (NoSQL)
- Gli aggiornamenti real-time usano **WebSocket**

## 🚀 Deploy in Produzione

### Backend
1. Usa un MongoDB gestito (MongoDB Atlas)
2. Configura un reverse proxy (nginx)
3. Usa HTTPS con certificato SSL
4. Cambia JWT_SECRET_KEY
5. Configura CORS con domini specifici
6. Usa gunicorn/uvicorn workers

### Frontend
1. Build produzione: `yarn build`
2. Servi con nginx o CDN
3. Configura REACT_APP_BACKEND_URL con URL produzione
4. Abilita HTTPS

## 📄 Licenza

Progetto sviluppato per LuminosMC.

## 🤝 Supporto

Per supporto o domande, contatta il team di sviluppo.

---

**Versione:** 1.0.0  
**Data:** Dicembre 2025  
**Stack:** FastAPI + React + MongoDB + WebSocket
