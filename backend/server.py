from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "luminosmc-secret-key-2025-ultra-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# ==================== MODELS ====================

class UserBase(BaseModel):
    username: str

class UserRegister(BaseModel):
    username: str
    password: str

    @field_validator('username')
    def username_length(cls, v):
        if len(v) < 3:
            raise ValueError('Username deve essere di almeno 3 caratteri')
        return v

    @field_validator('password')
    def password_length(cls, v):
        if len(v) < 4:
            raise ValueError('Password deve essere di almeno 4 caratteri')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    created: str

class AdminUserCreate(BaseModel):
    username: str
    password: str
    roles: List[str]

    @field_validator('username')
    def username_length(cls, v):
        if len(v) < 3:
            raise ValueError('Username deve essere di almeno 3 caratteri')
        return v

    @field_validator('password')
    def password_length(cls, v):
        if len(v) < 4:
            raise ValueError('Password deve essere di almeno 4 caratteri')
        return v

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    roles: List[str]
    created: str

class AdminUserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    roles: Optional[List[str]] = None

class PostCreate(BaseModel):
    title: str
    content: str

    @field_validator('title')
    def title_length(cls, v):
        if len(v) < 5:
            raise ValueError('Il titolo deve essere di almeno 5 caratteri')
        if len(v) > 100:
            raise ValueError('Il titolo non può superare i 100 caratteri')
        return v

    @field_validator('content')
    def content_length(cls, v):
        if len(v) < 10:
            raise ValueError('Il contenuto deve essere di almeno 10 caratteri')
        if len(v) > 1000:
            raise ValueError('Il contenuto non può superare i 1000 caratteri')
        return v

class Reply(BaseModel):
    content: str
    author: str
    date: str

class ReplyCreate(BaseModel):
    content: str

    @field_validator('content')
    def content_length(cls, v):
        if len(v) < 3:
            raise ValueError('La risposta deve essere di almeno 3 caratteri')
        return v

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    author: str
    date: str
    replies: List[Reply] = []

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    price: float
    features: List[str]
    featured: bool = False

    @field_validator('price')
    def price_positive(cls, v):
        if v <= 0:
            raise ValueError('Il prezzo deve essere maggiore di 0')
        return v

    @field_validator('features')
    def features_not_empty(cls, v):
        if len(v) == 0:
            raise ValueError('Inserisci almeno una feature')
        return v

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    price: float
    features: List[str]
    featured: bool

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    featured: Optional[bool] = None

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    color: str
    permissions: List[str]
    system: bool = False

class RoleCreate(BaseModel):
    name: str
    color: str
    permissions: List[str]

    @field_validator('name')
    def name_length(cls, v):
        if len(v) < 3:
            raise ValueError('Il nome del ruolo deve essere di almeno 3 caratteri')
        return v

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    permissions: Optional[List[str]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator('new_password')
    def password_length(cls, v):
        if len(v) < 4:
            raise ValueError('La nuova password deve essere di almeno 4 caratteri')
        return v

# ==================== AUTH HELPERS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_type: str = payload.get("type")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    if user_type == "admin":
        user = await db.admin_users.find_one({"username": username}, {"_id": 0})
    else:
        user = await db.users.find_one({"username": username}, {"_id": 0})
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if "roles" not in current_user or not current_user["roles"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi amministrativi"
        )
    return current_user

async def check_permission(user: dict, permission: str) -> bool:
    if "roles" not in user or not user["roles"]:
        return False
    
    roles = await db.roles.find({"id": {"$in": user["roles"]}}, {"_id": 0}).to_list(100)
    for role in roles:
        if permission in role.get("permissions", []):
            return True
    return False

# ==================== INITIALIZATION ====================

async def initialize_default_data():
    # Check if owner exists
    owner_exists = await db.admin_users.find_one({"username": "TheMarck_MC"})
    if not owner_exists:
        owner = {
            "id": str(uuid.uuid4()),
            "username": "TheMarck_MC",
            "password": get_password_hash("1234"),
            "roles": ["owner"],
            "created": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }
        await db.admin_users.insert_one(owner)
    
    # Check if roles exist
    roles_count = await db.roles.count_documents({})
    if roles_count == 0:
        default_roles = [
            {
                "id": "owner",
                "name": "Owner",
                "color": "owner",
                "permissions": ["manage_posts", "manage_staff", "manage_products", "manage_roles", "view_admin", "delete_any_post", "edit_any_post", "manage_users"],
                "system": True
            },
            {
                "id": "admin",
                "name": "Admin",
                "color": "admin",
                "permissions": ["manage_posts", "manage_staff", "view_admin", "delete_any_post", "edit_any_post", "manage_users"],
                "system": False
            },
            {
                "id": "moderator",
                "name": "Moderatore",
                "color": "moderator",
                "permissions": ["manage_posts", "view_admin", "delete_any_post"],
                "system": False
            },
            {
                "id": "helper",
                "name": "Helper",
                "color": "helper",
                "permissions": ["view_admin"],
                "system": False
            }
        ]
        await db.roles.insert_many(default_roles)
    
    # Check if products exist
    products_count = await db.products.count_documents({})
    if products_count == 0:
        default_products = [
            {
                "id": str(uuid.uuid4()),
                "name": "VIP Bronze",
                "price": 4.99,
                "features": ["Prefix dedicato", "Kit giornaliero", "Queue prioritaria"],
                "featured": False
            },
            {
                "id": str(uuid.uuid4()),
                "name": "VIP Silver",
                "price": 9.99,
                "features": ["Tutto di Bronze", "Particles esclusive", "/hat e /nick"],
                "featured": False
            },
            {
                "id": str(uuid.uuid4()),
                "name": "VIP Gold",
                "price": 14.99,
                "features": ["Tutto di Silver", "Kit potenziato Lifesteal", "Slot riservato"],
                "featured": True
            },
            {
                "id": str(uuid.uuid4()),
                "name": "VIP Legend",
                "price": 24.99,
                "features": ["Tutto di Gold", "Emote custom", "Ricompense evento +"],
                "featured": False
            }
        ]
        await db.products.insert_many(default_products)

@app.on_event("startup")
async def startup_event():
    await initialize_default_data()
    logger.info("Application started and default data initialized")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserRegister):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username già esistente"
        )
    
    # Create new user
    user = {
        "id": str(uuid.uuid4()),
        "username": user_data.username,
        "password": get_password_hash(user_data.password),
        "created": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    await db.users.insert_one(user)
    
    # Broadcast update
    await manager.broadcast({"type": "user_registered", "username": user_data.username})
    
    return User(**{k: v for k, v in user.items() if k != "password"})

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali errate"
        )
    
    access_token = create_access_token(data={"sub": user["username"], "type": "user"})
    user_without_password = {k: v for k, v in user.items() if k != "password"}
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_without_password
    )

@api_router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(user_data: UserLogin):
    user = await db.admin_users.find_one({"username": user_data.username}, {"_id": 0})
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali admin errate"
        )
    
    access_token = create_access_token(data={"sub": user["username"], "type": "admin"})
    user_without_password = {k: v for k, v in user.items() if k != "password"}
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_without_password
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password"}

@api_router.post("/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    # Verify old password
    if not verify_password(password_data.old_password, current_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password attuale errata"
        )
    
    # Update password
    new_hashed_password = get_password_hash(password_data.new_password)
    
    if "roles" in current_user and current_user["roles"]:
        await db.admin_users.update_one(
            {"id": current_user["id"]},
            {"$set": {"password": new_hashed_password}}
        )
    else:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"password": new_hashed_password}}
        )
    
    return {"message": "Password modificata con successo"}

# ==================== POSTS ROUTES ====================

@api_router.get("/posts", response_model=List[Post])
async def get_posts():
    posts = await db.posts.find({}, {"_id": 0}).to_list(1000)
    return posts

@api_router.post("/posts", response_model=Post)
async def create_post(
    post_data: PostCreate,
    current_user: dict = Depends(get_current_user)
):
    post = {
        "id": str(uuid.uuid4()),
        "title": post_data.title,
        "content": post_data.content,
        "author": current_user["username"],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "replies": []
    }
    await db.posts.insert_one(post)
    
    # Broadcast update
    await manager.broadcast({"type": "post_created", "post": post})
    
    return Post(**post)

@api_router.put("/posts/{post_id}", response_model=Post)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    current_user: dict = Depends(get_current_user)
):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trovato")
    
    # Check permissions
    is_author = post["author"] == current_user["username"]
    has_edit_permission = await check_permission(current_user, "edit_any_post")
    
    if not is_author and not has_edit_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per modificare questo post"
        )
    
    update_data = {k: v for k, v in post_data.model_dump().items() if v is not None}
    if update_data:
        await db.posts.update_one({"id": post_id}, {"$set": update_data})
        post.update(update_data)
    
    # Broadcast update
    await manager.broadcast({"type": "post_updated", "post_id": post_id})
    
    return Post(**post)

@api_router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trovato")
    
    # Check permissions
    is_author = post["author"] == current_user["username"]
    has_delete_permission = await check_permission(current_user, "delete_any_post")
    
    if not is_author and not has_delete_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per eliminare questo post"
        )
    
    await db.posts.delete_one({"id": post_id})
    
    # Broadcast update
    await manager.broadcast({"type": "post_deleted", "post_id": post_id})
    
    return {"message": "Post eliminato con successo"}

@api_router.post("/posts/{post_id}/replies")
async def add_reply(
    post_id: str,
    reply_data: ReplyCreate,
    current_user: dict = Depends(get_current_user)
):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trovato")
    
    reply = {
        "content": reply_data.content,
        "author": current_user["username"],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    
    await db.posts.update_one(
        {"id": post_id},
        {"$push": {"replies": reply}}
    )
    
    # Broadcast update
    await manager.broadcast({"type": "reply_added", "post_id": post_id})
    
    return reply

# ==================== PRODUCTS ROUTES ====================

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/products", response_model=Product)
async def create_product(
    product_data: ProductCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_products"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per gestire i prodotti"
        )
    
    product = {
        "id": str(uuid.uuid4()),
        "name": product_data.name,
        "price": product_data.price,
        "features": product_data.features,
        "featured": product_data.featured
    }
    await db.products.insert_one(product)
    
    # Broadcast update
    await manager.broadcast({"type": "product_created", "product": product})
    
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_products"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per gestire i prodotti"
        )
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    
    update_data = {k: v for k, v in product_data.model_dump().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
        product.update(update_data)
    
    # Broadcast update
    await manager.broadcast({"type": "product_updated", "product_id": product_id})
    
    return Product(**product)

@api_router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_products"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per gestire i prodotti"
        )
    
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    
    # Broadcast update
    await manager.broadcast({"type": "product_deleted", "product_id": product_id})
    
    return {"message": "Prodotto eliminato con successo"}

# ==================== ADMIN USERS ROUTES ====================

@api_router.get("/admin/users/forum", response_model=List[User])
async def get_forum_users(current_user: dict = Depends(get_current_admin_user)):
    if not await check_permission(current_user, "manage_users"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per visualizzare gli utenti"
        )
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.delete("/admin/users/forum/{user_id}")
async def delete_forum_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_users"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per eliminare gli utenti"
        )
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Broadcast update
    await manager.broadcast({"type": "user_deleted", "user_id": user_id})
    
    return {"message": "Utente eliminato con successo"}

@api_router.get("/admin/staff", response_model=List[AdminUser])
async def get_staff(current_user: dict = Depends(get_current_admin_user)):
    if not await check_permission(current_user, "manage_staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per visualizzare lo staff"
        )
    
    staff = await db.admin_users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return staff

@api_router.post("/admin/staff", response_model=AdminUser)
async def create_staff(
    staff_data: AdminUserCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per aggiungere staff"
        )
    
    # Check if username already exists
    existing_user = await db.admin_users.find_one({"username": staff_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username già esistente"
        )
    
    staff = {
        "id": str(uuid.uuid4()),
        "username": staff_data.username,
        "password": get_password_hash(staff_data.password),
        "roles": staff_data.roles,
        "created": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    await db.admin_users.insert_one(staff)
    
    # Broadcast update
    await manager.broadcast({"type": "staff_created", "username": staff_data.username})
    
    return AdminUser(**{k: v for k, v in staff.items() if k != "password"})

@api_router.put("/admin/staff/{staff_id}", response_model=AdminUser)
async def update_staff(
    staff_id: str,
    staff_data: AdminUserUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per modificare lo staff"
        )
    
    staff = await db.admin_users.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff non trovato")
    
    update_data = {}
    if staff_data.username:
        update_data["username"] = staff_data.username
    if staff_data.password:
        update_data["password"] = get_password_hash(staff_data.password)
    if staff_data.roles is not None:
        update_data["roles"] = staff_data.roles
    
    if update_data:
        await db.admin_users.update_one({"id": staff_id}, {"$set": update_data})
        staff.update(update_data)
    
    # Broadcast update
    await manager.broadcast({"type": "staff_updated", "staff_id": staff_id})
    
    return AdminUser(**{k: v for k, v in staff.items() if k != "password"})

@api_router.delete("/admin/staff/{staff_id}")
async def delete_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per eliminare lo staff"
        )
    
    staff = await db.admin_users.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff non trovato")
    
    # Prevent deleting the main owner
    if "owner" in staff.get("roles", []) and staff["username"] == "TheMarck_MC":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi eliminare l'owner principale"
        )
    
    await db.admin_users.delete_one({"id": staff_id})
    
    # Broadcast update
    await manager.broadcast({"type": "staff_deleted", "staff_id": staff_id})
    
    return {"message": "Staff rimosso con successo"}

# ==================== ROLES ROUTES ====================

@api_router.get("/roles", response_model=List[Role])
async def get_roles():
    roles = await db.roles.find({}, {"_id": 0}).to_list(1000)
    return roles

@api_router.post("/roles", response_model=Role)
async def create_role(
    role_data: RoleCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per creare ruoli"
        )
    
    role_id = role_data.name.lower().replace(" ", "_")
    
    # Check if role already exists
    existing_role = await db.roles.find_one({"id": role_id})
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esiste già un ruolo con questo nome"
        )
    
    role = {
        "id": role_id,
        "name": role_data.name,
        "color": role_data.color,
        "permissions": role_data.permissions,
        "system": False
    }
    await db.roles.insert_one(role)
    
    # Broadcast update
    await manager.broadcast({"type": "role_created", "role": role})
    
    return Role(**role)

@api_router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per modificare i ruoli"
        )
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Ruolo non trovato")
    
    if role.get("system"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi modificare un ruolo di sistema"
        )
    
    update_data = {k: v for k, v in role_data.model_dump().items() if v is not None}
    if update_data:
        await db.roles.update_one({"id": role_id}, {"$set": update_data})
        role.update(update_data)
    
    # Broadcast update
    await manager.broadcast({"type": "role_updated", "role_id": role_id})
    
    return Role(**role)

@api_router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    if not await check_permission(current_user, "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per eliminare i ruoli"
        )
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Ruolo non trovato")
    
    if role.get("system"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi eliminare un ruolo di sistema"
        )
    
    # Check if any users have this role
    users_with_role = await db.admin_users.find(
        {"roles": role_id},
        {"_id": 0}
    ).to_list(1000)
    
    if users_with_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossibile eliminare: {len(users_with_role)} membri staff hanno questo ruolo"
        )
    
    await db.roles.delete_one({"id": role_id})
    
    # Broadcast update
    await manager.broadcast({"type": "role_deleted", "role_id": role_id})
    
    return {"message": "Ruolo eliminato con successo"}

# ==================== STATS ROUTES ====================

@api_router.get("/admin/stats")
async def get_stats(current_user: dict = Depends(get_current_admin_user)):
    posts_count = await db.posts.count_documents({})
    users_count = await db.users.count_documents({})
    staff_count = await db.admin_users.count_documents({})
    products_count = await db.products.count_documents({})
    
    return {
        "posts": posts_count,
        "users": users_count,
        "staff": staff_count,
        "products": products_count
    }

# ==================== WEBSOCKET ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "LuminosMC API"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
