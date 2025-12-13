# 🚀 Quick Start Guide - LuminosMC Forum

## Setup Rapido (5 minuti)

### 1️⃣ Prerequisiti
```bash
# Verifica di avere installato:
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
```

### 2️⃣ Backend Setup
```bash
cd backend

# Installa dipendenze
pip install -r requirements.txt

# Copia e configura .env
cp .env.example .env
# Modifica MONGO_URL se necessario

# Avvia MongoDB (se non già in esecuzione)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Avvia il server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

✅ Backend pronto su: http://localhost:8001

### 3️⃣ Frontend Setup
```bash
cd frontend

# Installa dipendenze
yarn install

# Copia e configura .env
cp .env.example .env
# Verifica che REACT_APP_BACKEND_URL=http://localhost:8001

# Avvia l'app
yarn start
```

✅ Frontend pronto su: http://localhost:3000

### 4️⃣ Test Immediato

1. **Apri il browser:** http://localhost:3000

2. **Login Admin:**
   - Username: `TheMarck_MC`
   - Password: `1234`

3. **Oppure registra un nuovo utente** e inizia subito a usare il forum!

## 📝 Comandi Utili

```bash
# Backend
uvicorn server:app --reload              # Dev mode
uvicorn server:app --host 0.0.0.0        # Production

# Frontend
yarn start                                # Dev mode
yarn build                                # Build production

# MongoDB
docker start mongodb                      # Avvia container
docker exec -it mongodb mongosh          # Shell MongoDB
```

## 🔥 Features Ready-to-Use

- ✅ Registrazione e login utenti
- ✅ Forum con post e risposte
- ✅ Store con prodotti VIP
- ✅ Pannello admin completo
- ✅ Gestione ruoli e permessi
- ✅ Aggiornamenti real-time (WebSocket)
- ✅ Sessioni persistenti

## 🎯 URLs Utili

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs (Swagger UI automatico)
- MongoDB: mongodb://localhost:27017

## 🐛 Problemi Comuni

**Porta già in uso:**
```bash
# Backend (8001)
lsof -ti:8001 | xargs kill -9

# Frontend (3000)
lsof -ti:3000 | xargs kill -9
```

**MongoDB non si connette:**
```bash
# Verifica che MongoDB sia in esecuzione
docker ps | grep mongodb

# Controlla i log
docker logs mongodb
```

**CORS Error:**
Verifica che `CORS_ORIGINS` in backend/.env sia configurato correttamente.

## 📚 Prossimi Passi

1. Esplora il pannello admin
2. Crea alcuni post di test
3. Prova i ruoli personalizzati
4. Aggiungi prodotti allo store
5. Testa gli aggiornamenti real-time (apri 2 tab)

## 💡 Tips

- Il database si inizializza automaticamente al primo avvio
- Le password sono hashate con bcrypt
- I JWT durano 7 giorni
- WebSocket si riconnette automaticamente
- Tutti i dati sono persistenti in MongoDB

---

**Hai domenti?** Consulta il README.md completo per dettagli avanzati.

Buon divertimento con LuminosMC! ⚡
