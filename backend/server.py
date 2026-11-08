from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
import base64
import io
import json
import asyncio
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'coach-athletes-secret-key-2024')
JWT_ALGORITHM = "HS256"
# Durata del token in giorni. Più lunga = gli atleti devono rifare il login meno spesso
# (utile con rete scarsa). Il frontend rinnova il token in automatico quando è online.
TOKEN_DAYS = int(os.environ.get('TOKEN_DAYS', '30'))

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "athlete"  # "admin" or "athlete"
    athlete_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    athlete_id: Optional[str] = None

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class AthleteCreate(BaseModel):
    name: str
    username: str
    password: str

class AthleteUpdate(BaseModel):
    name: Optional[str] = None

class AthleteResponse(BaseModel):
    id: str
    name: str
    username: str
    created_at: str
    # Funzioni in prova (beta): spente di default, le attiva il coach atleta per atleta
    beta_visits: bool = False
    beta_self_measure: bool = False  # "Misurati da casa" (richiede anche le Visite)

class BetaUpdate(BaseModel):
    visits: Optional[bool] = None
    self_measure: Optional[bool] = None

class DietMeal(BaseModel):
    name: str
    description: str
    time: Optional[str] = None

class DietMacros(BaseModel):
    meal_name: str
    calories: int
    proteins: float
    carbs: float
    fats: float

class DietWeeklyDay(BaseModel):
    day: str
    meals: List[DietMeal]

class DietPDF(BaseModel):
    name: str
    pdf_data: str

class DietFood(BaseModel):
    alimento: str
    quantita: Optional[float] = None
    calorie: Optional[float] = None
    proteine: Optional[float] = None
    carboidrati: Optional[float] = None
    grassi: Optional[float] = None
    fibre: Optional[float] = None
    note: Optional[str] = None

class DietMealNew(BaseModel):
    pasto: str  # Colazione, Pranzo, Cena, Merenda
    alimenti: List[DietFood] = []

class DietDay(BaseModel):
    nome: str  # es. "Giorno 1", "Lunedì"
    pasti: List[DietMealNew] = []

class DietStructured(BaseModel):
    giorni: List[DietDay] = []
    visible_to_athlete: bool = True
    note_generali: Optional[str] = None

class DietData(BaseModel):
    pdf_data: Optional[str] = None
    pdfs: Optional[List["DietPDF"]] = None
    visible_to_athlete: bool = True
    # New structured diet
    structured: Optional[DietStructured] = None

class WeekData(BaseModel):
    # Giorni di forza
    sets: Optional[str] = ""
    reps: Optional[str] = ""
    rpe: Optional[str] = ""
    carico: Optional[str] = ""
    note: Optional[str] = ""
    # Giorni di corsa (salvati solo se usati)
    ripetizioni: Optional[str] = None
    metri: Optional[str] = None
    km: Optional[str] = None
    tempo: Optional[str] = None
    zona: Optional[str] = None

class TrainingExercise(BaseModel):
    name: str
    weeks: Optional[List[WeekData]] = []
    # Legacy fields kept for backward compatibility
    sets: Optional[int] = None
    reps: Optional[str] = None
    notes: Optional[str] = None

class TrainingDay(BaseModel):
    day: str
    # "forza" (predefinito, anche per i programmi esistenti senza tipo) oppure "corsa"
    type: Optional[str] = None
    exercises: List[TrainingExercise]

class TrainingData(BaseModel):
    program_name: str = ""
    num_weeks: Optional[int] = 4
    days: List[TrainingDay] = []

class NoteData(BaseModel):
    content: str
    created_at: Optional[str] = None

class LoadEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exercise: str
    weight: float
    reps: int
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoadCreate(BaseModel):
    exercise: str
    weight: float
    reps: int
    notes: Optional[str] = None

class PhotoCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_data: str  # Base64
    visible_to_coach: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PhotoCreate(BaseModel):
    image_data: str
    visible_to_coach: bool = False

class WeekNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    athlete_id: str
    athlete_name: str
    week_number: int = 3
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    read: bool = False

# ============ CHECK (PESO/ALTEZZA) MODELS ============

class BodyCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    weight: float  # kg
    height: Optional[float] = None  # cm
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BodyCheckCreate(BaseModel):
    weight: float
    height: Optional[float] = None
    notes: Optional[str] = None
    # Campi opzionali usati dal salvataggio offline:
    # client_id evita duplicati se l'invio viene ripetuto, created_at conserva la data reale
    client_id: Optional[str] = None
    created_at: Optional[str] = None

# ============ TRAINING LOAD MODELS ============

class TrainingLoad(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exercise_name: str
    week: int
    sets: List[dict] = []  # [{reps: 10, weight: 80}, ...]
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TrainingLoadCreate(BaseModel):
    exercise_name: str
    week: int
    sets: List[dict] = []
    notes: Optional[str] = None

# ============ EXERCISE VIDEO LIBRARY MODELS ============

class ExerciseVideo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    video_url: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExerciseVideoCreate(BaseModel):
    name: str
    video_url: str

# ============ VIDEO MODELS ============

class VideoUpload(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    video_data: str  # Base64 encoded video
    title: str
    visible_to_coach: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VideoCreate(BaseModel):
    video_data: str
    title: str
    visible_to_coach: bool = False

class VideoAnnotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    video_id: str
    frame_time: float  # timestamp in seconds
    drawing_data: str  # JSON serialized canvas data
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AnnotationCreate(BaseModel):
    video_id: str
    frame_time: float
    drawing_data: str
    notes: Optional[str] = None

# ============ FOOD DATABASE MODELS ============

class Micronutrient(BaseModel):
    name: str
    amount: float
    unit: str  # mg, mcg, etc.

class FoodItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    calories: float
    proteins: float
    carbs: float
    fats: float
    fiber: Optional[float] = 0
    micronutrients: List[Micronutrient] = []
    serving_size: str = "100g"
    category: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FoodItemCreate(BaseModel):
    name: str
    calories: float
    proteins: float
    carbs: float
    fats: float
    fiber: Optional[float] = 0
    micronutrients: List[Micronutrient] = []
    serving_size: str = "100g"
    category: Optional[str] = None

class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    calories: Optional[float] = None
    proteins: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None
    fiber: Optional[float] = None
    micronutrients: Optional[List[Micronutrient]] = None
    serving_size: Optional[str] = None
    category: Optional[str] = None

class NotionImport(BaseModel):
    data: List[Dict[str, Any]]  # JSON data from Notion export

class VideoVisibilityUpdate(BaseModel):
    visible: bool

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, username: str, role: str, athlete_id: str = None) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "athlete_id": athlete_id,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * TOKEN_DAYS
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return user

async def require_athlete(user=Depends(get_current_user)):
    if user.get("role") != "athlete":
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"username": data.username}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    token = create_token(user["id"], user["username"], user["role"], user.get("athlete_id"))
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            role=user["role"],
            athlete_id=user.get("athlete_id")
        )
    )

@api_router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(user=Depends(get_current_user)):
    """Rinnova un token ancora valido, così l'atleta non deve rifare il login
    (il frontend lo chiama in background quando c'è rete)."""
    db_user = await db.users.find_one({"id": user.get("user_id")}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    token = create_token(db_user["id"], db_user["username"], db_user["role"], db_user.get("athlete_id"))
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=db_user["id"],
            username=db_user["username"],
            role=db_user["role"],
            athlete_id=db_user.get("athlete_id")
        )
    )

@api_router.post("/auth/init-admin")
async def init_admin(secret: str = ""):
    """Initialize admin user if not exists. Requires INIT_SECRET in production."""
    # In production, require a secret token to prevent unauthorized admin creation
    init_secret = os.environ.get("INIT_SECRET", "")
    if init_secret and secret != init_secret:
        raise HTTPException(status_code=403, detail="Non autorizzato")

    existing = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if existing:
        return {"message": "Admin già esistente", "username": existing["username"]}

    admin_id = str(uuid.uuid4())
    admin_user = {
        "id": admin_id,
        "username": "admin",
        "password": hash_password("admin123"),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    return {"message": "Admin creato", "username": "admin", "password": "admin123"}

# ============ ADMIN - ATHLETES MANAGEMENT ============

@api_router.get("/admin/athletes", response_model=List[AthleteResponse])
async def get_athletes(user=Depends(require_admin)):
    athletes = await db.athletes.find({}, {"_id": 0}).to_list(1000)
    return athletes

@api_router.post("/admin/athletes", response_model=AthleteResponse)
async def create_athlete(data: AthleteCreate, user=Depends(require_admin)):
    # Check username uniqueness
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username già in uso")

    athlete_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Create athlete record
    athlete = {
        "id": athlete_id,
        "name": data.name,
        "username": data.username,
        "created_at": now
    }
    await db.athletes.insert_one(athlete)

    # Create user account for athlete
    user_record = {
        "id": user_id,
        "username": data.username,
        "password": hash_password(data.password),
        "role": "athlete",
        "athlete_id": athlete_id,
        "created_at": now
    }
    await db.users.insert_one(user_record)

    # Initialize empty data for athlete
    await db.diets.insert_one({"athlete_id": athlete_id, "pdf_data": None, "visible_to_athlete": True})
    await db.trainings.insert_one({"athlete_id": athlete_id, "program_name": "", "days": []})
    await db.notes.insert_one({"athlete_id": athlete_id, "content": "", "created_at": now})

    return AthleteResponse(id=athlete_id, name=data.name, username=data.username, created_at=now)

@api_router.get("/admin/athletes/{athlete_id}")
async def get_athlete_detail(athlete_id: str, user=Depends(require_admin)):
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if not athlete:
        raise HTTPException(status_code=404, detail="Atleta non trovato")

    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0})
    training = await db.trainings.find_one({"athlete_id": athlete_id}, {"_id": 0})
    notes = await db.notes.find_one({"athlete_id": athlete_id}, {"_id": 0})
    # Carichi della vecchia versione dell'app (se presenti): servono solo per includerli nel PDF di archivio
    loads = await db.loads.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(1000)
    # Only show photos marked as visible to coach
    raw_photos = await db.photos.find({"athlete_id": athlete_id, "visible_to_coach": True}).to_list(1000)
    photos = []
    for p in raw_photos:
        p["id"] = p.get("id") or str(p.get("_id", ""))
        p.pop("_id", None)
        photos.append(p)

    return {
        "athlete": athlete,
        "diet": diet or {"pdf_data": None, "visible_to_athlete": True},
        "training": training or {"program_name": "", "days": []},
        "notes": notes or {"content": ""},
        "loads": loads,
        "photos": photos
    }

@api_router.put("/admin/athletes/{athlete_id}")
async def update_athlete(athlete_id: str, data: AthleteUpdate, user=Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.athletes.update_one({"id": athlete_id}, {"$set": update_data})
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    return athlete

@api_router.delete("/admin/athletes/{athlete_id}")
async def delete_athlete(athlete_id: str, user=Depends(require_admin)):
    # Get athlete to find username
    athlete = await db.athletes.find_one({"id": athlete_id})
    if not athlete:
        raise HTTPException(status_code=404, detail="Atleta non trovato")

    # Delete all related data
    await db.athletes.delete_one({"id": athlete_id})
    await db.users.delete_one({"athlete_id": athlete_id})
    await db.diets.delete_one({"athlete_id": athlete_id})
    await db.trainings.delete_one({"athlete_id": athlete_id})
    await db.notes.delete_one({"athlete_id": athlete_id})
    await db.loads.delete_many({"athlete_id": athlete_id})
    await db.photos.delete_many({"athlete_id": athlete_id})
    await db.week_notifications.delete_many({"athlete_id": athlete_id})
    # Dati che prima restavano nel database anche dopo l'eliminazione dell'atleta
    await db.training_loads.delete_many({"athlete_id": athlete_id})
    await db.body_checks.delete_many({"athlete_id": athlete_id})
    await db.macros.delete_many({"athlete_id": athlete_id})
    await db.training_history.delete_many({"athlete_id": athlete_id})
    await db.expiry_notifications.delete_many({"athlete_id": athlete_id})
    video_ids = [v["id"] async for v in db.videos.find({"athlete_id": athlete_id}, {"id": 1}) if v.get("id")]
    if video_ids:
        await db.video_annotations.delete_many({"video_id": {"$in": video_ids}})
    await db.videos.delete_many({"athlete_id": athlete_id})
    await db.visits.delete_many({"athlete_id": athlete_id})
    await db.visits_deleted_checks.delete_many({"athlete_id": athlete_id})

    return {"message": "Atleta eliminato"}

# ============ ADMIN - DIET MANAGEMENT ============

@api_router.put("/admin/athletes/{athlete_id}/diet")
async def update_diet(athlete_id: str, data: DietData, user=Depends(require_admin)):
    diet_doc = {
        "athlete_id": athlete_id,
        "pdfs": [p.model_dump() for p in data.pdfs] if data.pdfs else None,
        "visible_to_athlete": data.visible_to_athlete,
    }
    # Vecchio PDF "singolo": non più mostrato dall'app. Si può solo svuotare, non riscrivere
    # (evita che una pagina admin aperta da tempo lo rimetta dopo una pulizia dello spazio).
    if "pdf_data" in data.model_fields_set and not data.pdf_data:
        diet_doc["pdf_data"] = None
    await db.diets.update_one({"athlete_id": athlete_id}, {"$set": diet_doc}, upsert=True)
    return {"message": "Dieta aggiornata"}

@api_router.put("/admin/athletes/{athlete_id}/diet/visibility")
async def toggle_diet_visibility(athlete_id: str, visible: bool, user=Depends(require_admin)):
    await db.diets.update_one({"athlete_id": athlete_id}, {"$set": {"visible_to_athlete": visible}})
    return {"message": "Visibilità aggiornata", "visible_to_athlete": visible}

# ============ ADMIN - TRAINING MANAGEMENT ============

@api_router.put("/admin/athletes/{athlete_id}/training")
async def update_training(athlete_id: str, data: TrainingData, user=Depends(require_admin)):
    # exclude_none: i campi della corsa non vengono salvati nei giorni di forza (meno spazio)
    training_doc = data.model_dump(exclude_none=True)
    training_doc["athlete_id"] = athlete_id
    await db.trainings.update_one({"athlete_id": athlete_id}, {"$set": training_doc}, upsert=True)
    return {"message": "Allenamento aggiornato"}

# ============ ADMIN - NOTES MANAGEMENT ============

@api_router.put("/admin/athletes/{athlete_id}/notes")
async def update_notes(athlete_id: str, data: NoteData, user=Depends(require_admin)):
    notes_doc = {
        "athlete_id": athlete_id,
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notes.update_one({"athlete_id": athlete_id}, {"$set": notes_doc}, upsert=True)
    return {"message": "Note aggiornate"}

# ============ ADMIN - NOTIFICATIONS ============

@api_router.get("/admin/notifications")
async def get_notifications(user=Depends(require_admin)):
    notifications = await db.week_notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(require_admin)):
    await db.week_notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"message": "Notifica letta"}


@api_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(notification_id: str, user=Depends(require_admin)):
    await db.week_notifications.delete_one({"id": notification_id})
    return {"message": "Notifica eliminata"}

@api_router.delete("/admin/notifications")
async def delete_all_notifications(user=Depends(require_admin)):
    await db.week_notifications.delete_many({})
    return {"message": "Tutte le notifiche eliminate"}


# ============ 4-WEEK EXPIRY NOTIFICATIONS ============

CRON_SECRET = os.environ.get("CRON_SECRET", "")

class ExpiryNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    athlete_id: str
    athlete_name: str
    tipo: str  # "dieta" or "macro"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    read: bool = False

@api_router.api_route("/cron/check-expiry", methods=["GET", "POST"])
async def check_program_expiry(secret: str = ""):
    """
    Called daily (e.g. by cron-job.org) to check for athletes whose
    4-week program/macro cycle has ended, and create admin notifications.
    Repeats every 4-week cycle (day 28, 56, 84, 112...) as long as data_inizio stays set.
    Protected by CRON_SECRET env var.
    """
    if CRON_SECRET and secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Secret non valido")

    today = datetime.now(timezone.utc).date()
    notified_count = 0

    macros_cursor = db.macros.find({"data_inizio": {"$ne": None}})
    async for m in macros_cursor:
        data_inizio_str = m.get("data_inizio")
        if not data_inizio_str:
            continue
        try:
            start_date = datetime.fromisoformat(data_inizio_str.replace("Z", "+00:00")).date()
        except Exception:
            continue

        days_elapsed = (today - start_date).days
        if days_elapsed < 25:
            continue

        # Which 4-week cycle is ending next? (cycle 1 ends day 28, cycle 2 ends day 56, ...)
        cycle_number = (days_elapsed // 28) + 1
        cycle_end_day = cycle_number * 28
        days_to_boundary = cycle_end_day - days_elapsed

        # Warn window: 3 days before the cycle ends (day 25, 26, 27, 28 of each 28-day cycle)
        if not (0 <= days_to_boundary <= 3):
            continue

        athlete_id = m.get("athlete_id")

        # Dedupe: one notification per athlete per cycle_number
        existing = await db.expiry_notifications.find_one({
            "athlete_id": athlete_id,
            "tipo": "macro",
            "cycle_number": cycle_number
        })
        if existing:
            continue

        athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
        if not athlete:
            continue

        notif_doc = ExpiryNotification(
            athlete_id=athlete_id,
            athlete_name=athlete.get("name", "Atleta"),
            tipo="macro"
        ).model_dump()
        notif_doc["cycle_number"] = cycle_number
        await db.expiry_notifications.insert_one(notif_doc)
        notified_count += 1

    return {"message": "Controllo completato", "notifiche_create": notified_count}

@api_router.get("/admin/expiry-notifications")
async def get_expiry_notifications(user=Depends(require_admin)):
    notifications = await db.expiry_notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/admin/expiry-notifications/{notification_id}/read")
async def mark_expiry_notification_read(notification_id: str, user=Depends(require_admin)):
    await db.expiry_notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"message": "Notifica letta"}

@api_router.delete("/admin/expiry-notifications/{notification_id}")
async def delete_expiry_notification(notification_id: str, user=Depends(require_admin)):
    await db.expiry_notifications.delete_one({"id": notification_id})
    return {"message": "Notifica eliminata"}

@api_router.delete("/admin/expiry-notifications")
async def delete_all_expiry_notifications(user=Depends(require_admin)):
    await db.expiry_notifications.delete_many({})
    return {"message": "Tutte le notifiche eliminate"}

# ============ ATHLETE ROUTES ============

@api_router.get("/athlete/profile")
async def get_athlete_profile(light: bool = False, user=Depends(require_athlete)):
    """
    light=true  -> risposta leggera per rete scarsa: scheda, note e dieta strutturata,
                   ma SENZA il contenuto base64 dei PDF (solo nome e indice).
                   I PDF si scaricano uno alla volta con /athlete/diet/pdfs/{index}.
    light=false -> comportamento originale (compatibile con le versioni vecchie dell'app).
    """
    athlete_id = user.get("athlete_id")

    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if not athlete:
        raise HTTPException(status_code=404, detail="Profilo non trovato")

    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0})
    training = await db.trainings.find_one({"athlete_id": athlete_id}, {"_id": 0})
    notes = await db.notes.find_one({"athlete_id": athlete_id}, {"_id": 0})

    # Only include diet data if visible to athlete
    diet_response = None
    if diet and not diet.get("visible_to_athlete", True):
        diet_response = {"pdf_data": None, "pdfs": None, "structured": None, "visible_to_athlete": False}
    elif diet and diet.get("visible_to_athlete", True):
        pdfs = diet.get("pdfs")
        pdf_data = diet.get("pdf_data")
        if light:
            pdfs = [{"name": p.get("name", f"PDF {i + 1}"), "index": i} for i, p in enumerate(pdfs or [])]
            pdf_data = None
        diet_response = {
            "pdf_data": pdf_data,
            "pdfs": pdfs,
            "has_legacy_pdf": bool(diet.get("pdf_data")),
            "structured": diet.get("structured"),
            "plan": diet.get("plan_published"),  # solo il piano inviato, non le bozze del coach
            "visible_to_athlete": True
        }
    else:
        diet_response = {"pdf_data": None, "pdfs": None, "structured": None, "visible_to_athlete": True}

    return {
        "athlete": athlete,
        "diet": diet_response,
        "training": training or {"program_name": "", "days": []},
        "notes": notes or {"content": ""}
    }

@api_router.get("/athlete/diet/pdfs/{index}")
async def get_athlete_diet_pdf(index: int, user=Depends(require_athlete)):
    """Scarica un singolo PDF della dieta solo quando l'atleta lo apre."""
    athlete_id = user.get("athlete_id")
    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0})
    if not diet or not diet.get("visible_to_athlete", True):
        raise HTTPException(status_code=404, detail="PDF non disponibile")
    pdfs = diet.get("pdfs") or []
    if index < 0 or index >= len(pdfs):
        raise HTTPException(status_code=404, detail="PDF non trovato")
    pdf = pdfs[index]
    return {"name": pdf.get("name", f"PDF {index + 1}"), "pdf_data": pdf.get("pdf_data")}

@api_router.get("/athlete/loads")
async def get_athlete_loads(user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    loads = await db.loads.find({"athlete_id": athlete_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return loads

@api_router.post("/athlete/loads")
async def create_load(data: LoadCreate, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    load_entry = LoadEntry(
        exercise=data.exercise,
        weight=data.weight,
        reps=data.reps,
        notes=data.notes
    )
    load_doc = load_entry.model_dump()
    load_doc["athlete_id"] = athlete_id
    await db.loads.insert_one(load_doc)
    # Return clean response without MongoDB ObjectId
    return {"id": load_entry.id, "exercise": load_entry.exercise, "weight": load_entry.weight, "reps": load_entry.reps, "notes": load_entry.notes, "created_at": load_entry.created_at}

@api_router.delete("/athlete/loads/{load_id}")
async def delete_load(load_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    result = await db.loads.delete_one({"id": load_id, "athlete_id": athlete_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    return {"message": "Carico eliminato"}

@api_router.get("/athlete/photos")
async def get_athlete_photos(limit: int = 0, skip: int = 0, user=Depends(require_athlete)):
    """limit/skip opzionali: permettono di caricare le foto un po' alla volta (limit=0 = tutte)."""
    athlete_id = user.get("athlete_id")
    cursor = db.photos.find({"athlete_id": athlete_id}).sort("created_at", -1)
    if skip > 0:
        cursor = cursor.skip(skip)
    if limit > 0:
        cursor = cursor.limit(limit)
    raw_photos = await cursor.to_list(limit if limit > 0 else 100)
    photos = []
    for p in raw_photos:
        p["id"] = p.get("id") or str(p.get("_id", ""))
        p.pop("_id", None)
        photos.append(p)
    return photos

# ============ COMPRESSIONE IMMAGINI (spazio database) ============
# Foto ridotte a max 1600 px, JPEG qualità 80: 3-8 MB diventano ~200-400 KB senza differenze visibili.
PHOTO_MAX_SIDE = 1600
PHOTO_QUALITY = 80
PHOTO_COMPRESS_OVER = 350 * 1024  # sotto questa dimensione (in caratteri base64) la foto è già leggera

def _compress_image_data_url(data_url: str):
    """Ritorna (nuovo_data_url, risparmiato_in_caratteri) oppure (None, 0) se non conviene/non leggibile."""
    try:
        from PIL import Image, ImageOps
        m = re.match(r"^data:image/[^;]+;base64,(.*)$", data_url or "", re.S)
        raw = base64.b64decode(m.group(1) if m else data_url)
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # mantiene l'orientamento corretto della foto
        if img.mode not in ("RGB", "L"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            rgba = img.convert("RGBA")
            background.paste(rgba, mask=rgba.split()[-1])
            img = background
        elif img.mode == "L":
            img = img.convert("RGB")
        img.thumbnail((PHOTO_MAX_SIDE, PHOTO_MAX_SIDE))
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=PHOTO_QUALITY, optimize=True, progressive=True)
        new_url = "data:image/jpeg;base64," + base64.b64encode(out.getvalue()).decode()
        saved = len(data_url) - len(new_url)
        if saved < len(data_url) * 0.1:
            return None, 0
        return new_url, saved
    except Exception as e:
        logger.warning(f"Compressione foto non riuscita: {e}")
        return None, 0

@api_router.post("/athlete/photos")
async def upload_photo(data: PhotoCreate, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    image_data = data.image_data
    if image_data and len(image_data) > PHOTO_COMPRESS_OVER:
        compressed, _ = await asyncio.to_thread(_compress_image_data_url, image_data)
        if compressed:
            image_data = compressed
    photo = PhotoCheck(
        image_data=image_data,
        visible_to_coach=data.visible_to_coach
    )
    photo_doc = photo.model_dump()
    photo_doc["athlete_id"] = athlete_id
    photo_doc["optimized"] = True
    await db.photos.insert_one(photo_doc)
    return {"id": photo.id, "visible_to_coach": photo.visible_to_coach, "created_at": photo.created_at}

@api_router.put("/athlete/photos/{photo_id}/visibility")
async def toggle_photo_visibility(photo_id: str, visible: bool, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    await db.photos.update_one(
        {"id": photo_id, "athlete_id": athlete_id},
        {"$set": {"visible_to_coach": visible}}
    )
    return {"message": "Visibilità aggiornata"}

@api_router.delete("/admin/athletes/{athlete_id}/photos/{photo_id}")
async def delete_photo_admin(athlete_id: str, photo_id: str, user=Depends(require_admin)):
    # Try both id field and MongoDB _id
    from bson import ObjectId
    result = await db.photos.delete_one({"id": photo_id, "athlete_id": athlete_id})
    if result.deleted_count == 0:
        try:
            await db.photos.delete_one({"_id": ObjectId(photo_id), "athlete_id": athlete_id})
        except:
            pass
    return {"message": "Foto eliminata"}

@api_router.delete("/athlete/photos/{photo_id}")
async def delete_photo(photo_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    result = await db.photos.delete_one({"id": photo_id, "athlete_id": athlete_id})
    if result.deleted_count == 0:
        from bson import ObjectId
        try:
            await db.photos.delete_one({"_id": ObjectId(photo_id), "athlete_id": athlete_id})
        except:
            pass
    result = result
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    return {"message": "Foto eliminata"}

@api_router.post("/athlete/week-notification")
async def send_week_notification(user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})

    if not athlete:
        raise HTTPException(status_code=404, detail="Atleta non trovato")

    notification = WeekNotification(
        athlete_id=athlete_id,
        athlete_name=athlete["name"]
    )
    await db.week_notifications.insert_one(notification.model_dump())
    return {"message": "Notifica inviata al coach"}

# ============ BODY CHECK ROUTES (ATHLETE) ============

@api_router.get("/athlete/checks")
async def get_body_checks(user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    raw = await db.body_checks.find({"athlete_id": athlete_id}).sort("created_at", -1).to_list(1000)
    checks = []
    for c in raw:
        c["id"] = c.get("id") or str(c.get("_id", ""))
        c.pop("_id", None)
        checks.append(c)
    return checks

@api_router.post("/athlete/checks")
async def create_body_check(data: BodyCheckCreate, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")

    # Idempotenza: se l'app ha già inviato questo check (es. risposta persa per rete scarsa)
    # restituiamo quello esistente invece di crearne un doppione.
    if data.client_id:
        existing = await db.body_checks.find_one({"athlete_id": athlete_id, "client_id": data.client_id}, {"_id": 0})
        if existing:
            return {"id": existing["id"], "weight": existing.get("weight"), "height": existing.get("height"), "created_at": existing.get("created_at"), "duplicate": True}

    check = BodyCheck(
        weight=data.weight,
        height=data.height,
        notes=data.notes
    )
    check_doc = check.model_dump()
    if data.created_at:
        check_doc["created_at"] = data.created_at
    check_doc["athlete_id"] = athlete_id
    if data.client_id:
        check_doc["client_id"] = data.client_id
    await db.body_checks.insert_one(check_doc)
    return {"id": check.id, "weight": check.weight, "height": check.height, "created_at": check_doc["created_at"]}

@api_router.delete("/athlete/checks/{check_id}")
async def delete_body_check(check_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    result = await db.body_checks.delete_one({**_id_query(check_id), "athlete_id": athlete_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check non trovato")
    return {"message": "Check eliminato"}

class CheckDateUpdate(BaseModel):
    created_at: str  # ISO date string (YYYY-MM-DD)

@api_router.put("/athlete/checks/{check_id}/date")
async def update_check_date(check_id: str, data: CheckDateUpdate, user=Depends(require_athlete)):
    """Update only the date of a check, keeping weight/height intact"""
    athlete_id = user.get("athlete_id")
    # Normalize: accept YYYY-MM-DD and store as ISO with midday time to keep ordering stable
    new_date = data.created_at
    if len(new_date) == 10:
        new_date = new_date + "T12:00:00+00:00"
    result = await db.body_checks.update_one(
        {**_id_query(check_id), "athlete_id": athlete_id},
        {"$set": {"created_at": new_date}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Check non trovato")
    return {"message": "Data aggiornata"}

# ============ TRAINING LOADS ROUTES (ATHLETE) ============

@api_router.get("/athlete/training-loads")
async def get_training_loads(user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    loads = await db.training_loads.find({"athlete_id": athlete_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return loads

@api_router.post("/athlete/training-loads")
async def create_training_load(data: TrainingLoadCreate, user=Depends(require_athlete)):
    # Nota: è già "idempotente" (esercizio + settimana = un solo record),
    # quindi l'app può ripetere l'invio in sicurezza quando torna la rete.
    athlete_id = user.get("athlete_id")

    # Check if load already exists for this exercise and week
    existing = await db.training_loads.find_one({
        "athlete_id": athlete_id,
        "exercise_name": data.exercise_name,
        "week": data.week
    })

    if existing:
        # Update existing
        await db.training_loads.update_one(
            {"id": existing["id"]},
            {"$set": {"sets": data.sets, "notes": data.notes}}
        )
        return {"id": existing["id"], "updated": True}
    else:
        # Create new
        load = TrainingLoad(
            exercise_name=data.exercise_name,
            week=data.week,
            sets=data.sets,
            notes=data.notes
        )
        load_doc = load.model_dump()
        load_doc["athlete_id"] = athlete_id
        await db.training_loads.insert_one(load_doc)
        return {"id": load.id, "created": True}

@api_router.delete("/athlete/training-loads/{load_id}")
async def delete_training_load(load_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    result = await db.training_loads.delete_one({"id": load_id, "athlete_id": athlete_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    return {"message": "Carico eliminato"}

# ============ VISITE (sostituiscono i vecchi "check") ============
# Ogni visita: data, peso, altezza, circonferenze misurate col metro, stime da foto, note.
# Il "report" è il PDF della visita (HTML stampabile con le foto dentro): è l'unico posto
# dove le foto vengono conservate. Viene escluso dagli elenchi per tenerli leggeri.

VISIT_CIRCUMFERENCES = ["collo", "torace", "vita", "addome", "fianchi",
                        "braccio_dx", "braccio_sx", "coscia_dx", "coscia_sx", "polpaccio_dx", "polpaccio_sx"]

class VisitData(BaseModel):
    date: str  # YYYY-MM-DD
    weight: Optional[float] = None
    height: Optional[float] = None
    sex: Optional[str] = None  # "M" / "F": serve solo per la stima % grasso (formula US Navy)
    circumferences: Dict[str, Any] = {}
    photo_estimates: Dict[str, Any] = {}
    notes: Optional[str] = None
    # PDF della visita (data URL). Se assente in una modifica, si mantiene quello esistente.
    report_data: Optional[str] = None

LIST_PROJECTION = {"_id": 0, "report_data": 0}

def _clean_numbers(d: Dict[str, Any]) -> Dict[str, float]:
    out = {}
    for k, v in (d or {}).items():
        if v is None:
            continue
        try:
            f = float(str(v).replace(",", "."))
        except (TypeError, ValueError):
            continue
        if f > 0:
            out[str(k)[:40]] = round(f, 1)
    return out

async def migrate_checks_to_visits(athlete_id: str) -> int:
    """Copia nelle Visite i check (peso/altezza) dell'atleta non ancora copiati.
    I check originali NON vengono toccati: la sezione Check continua a funzionare come prima."""
    converted = 0
    already = set()
    async for v in db.visits.find({"athlete_id": athlete_id, "legacy_check_id": {"$exists": True}}, {"legacy_check_id": 1}):
        already.add(v.get("legacy_check_id"))
    # anche le visite copiate e poi eliminate non vengono ricreate
    async for d in db.visits_deleted_checks.find({"athlete_id": athlete_id}, {"legacy_check_id": 1}):
        already.add(d.get("legacy_check_id"))
    async for c in db.body_checks.find({"athlete_id": athlete_id}):
        cid = c.get("id") or str(c.get("_id"))
        if cid in already:
            continue
        created = c.get("created_at") or datetime.now(timezone.utc).isoformat()
        now = datetime.now(timezone.utc).isoformat()
        await db.visits.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "date": str(created)[:10],
            "weight": c.get("weight"),
            "height": c.get("height"),
            "sex": None,
            "circumferences": {},
            "photo_estimates": {},
            "notes": c.get("notes") or None,
            "has_report": False,
            "legacy_check_id": cid,
            "created_at": created,
            "updated_at": now,
        })
        converted += 1
    return converted

def _id_query(doc_id: str) -> dict:
    """Trova un documento dal suo "id" oppure, per i dati salvati da versioni vecchie senza "id", dall'_id di Mongo."""
    from bson import ObjectId
    if ObjectId.is_valid(doc_id):
        return {"$or": [{"id": doc_id}, {"_id": ObjectId(doc_id)}]}
    return {"id": doc_id}

async def _with_ids(coll, docs: list) -> list:
    """Ogni documento esce con un "id" (serve per modificarlo o eliminarlo dall'app)."""
    for d in docs:
        oid = d.pop("_id", None)
        if not d.get("id") and oid is not None:
            d["id"] = str(oid)
            try:  # lo salvo così la prossima volta c'è già
                await coll.update_one({"_id": oid}, {"$set": {"id": d["id"]}})
            except Exception as e:  # es. database pieno: va bene lo stesso, l'_id basta
                logger.warning("id non salvato su %s: %s", coll.name, e)
    return docs

async def list_visits_for(athlete_id: str):
    visits = await db.visits.find({"athlete_id": athlete_id}, {"report_data": 0}).sort([("date", -1), ("created_at", -1)]).to_list(500)
    return await _with_ids(db.visits, visits)

def _visit_doc(data: VisitData) -> dict:
    date = (data.date or "")[:10]
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data della visita non valida")
    sex = data.sex if data.sex in ("M", "F") else None
    return {
        "date": date,
        "weight": data.weight if data.weight and data.weight > 0 else None,
        "height": data.height if data.height and data.height > 0 else None,
        "sex": sex,
        "circumferences": _clean_numbers(data.circumferences),
        "photo_estimates": _clean_numbers(data.photo_estimates),
        "notes": (data.notes or "").strip() or None,
    }

@api_router.put("/admin/athletes/{athlete_id}/beta")
async def admin_set_beta(athlete_id: str, data: BetaUpdate, user=Depends(require_admin)):
    """Attiva/disattiva le funzioni beta per un atleta: Visite e "Misurati da casa".
    "Misurati da casa" vive dentro le Visite: attivarla accende anche le Visite,
    spegnere le Visite spegne anche "Misurati da casa"."""
    update = {}
    if data.visits is not None:
        update["beta_visits"] = bool(data.visits)
        if not data.visits:
            update["beta_self_measure"] = False
    if data.self_measure is not None:
        update["beta_self_measure"] = bool(data.self_measure)
        if data.self_measure:
            update["beta_visits"] = True
    if not update:
        raise HTTPException(status_code=400, detail="Niente da aggiornare")
    result = await db.athletes.update_one({"id": athlete_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Atleta non trovato")
    a = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "beta_visits": 1, "beta_self_measure": 1})
    return {"beta_visits": bool(a.get("beta_visits")), "beta_self_measure": bool(a.get("beta_self_measure"))}

async def require_visits_beta(athlete_id: str):
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "beta_visits": 1})
    if not athlete or not athlete.get("beta_visits"):
        raise HTTPException(status_code=403, detail="Sezione Visite non ancora disponibile")

@api_router.post("/admin/athletes/{athlete_id}/visits/import-checks")
async def admin_import_checks(athlete_id: str, user=Depends(require_admin)):
    """Copia i check di peso/altezza dell'atleta nelle Visite (i check originali restano dove sono)."""
    n = await migrate_checks_to_visits(athlete_id)
    return {"imported": n}

@api_router.get("/admin/athletes/{athlete_id}/visits")
async def admin_list_visits(athlete_id: str, user=Depends(require_admin)):
    return await list_visits_for(athlete_id)

@api_router.post("/admin/athletes/{athlete_id}/visits")
async def admin_create_visit(athlete_id: str, data: VisitData, user=Depends(require_admin)):
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 1})
    if not athlete:
        raise HTTPException(status_code=404, detail="Atleta non trovato")
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "athlete_id": athlete_id, **_visit_doc(data),
           "has_report": bool(data.report_data), "created_at": now, "updated_at": now}
    if data.report_data:
        doc["report_data"] = data.report_data
    await db.visits.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("report_data", None)
    return doc

@api_router.put("/admin/athletes/{athlete_id}/visits/{visit_id}")
async def admin_update_visit(athlete_id: str, visit_id: str, data: VisitData, user=Depends(require_admin)):
    update = {**_visit_doc(data), "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.report_data:
        update["report_data"] = data.report_data
        update["has_report"] = True
    result = await db.visits.update_one({"id": visit_id, "athlete_id": athlete_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visita non trovata")
    return await db.visits.find_one({"id": visit_id}, LIST_PROJECTION)

@api_router.delete("/admin/athletes/{athlete_id}/visits/{visit_id}")
async def admin_delete_visit(athlete_id: str, visit_id: str, user=Depends(require_admin)):
    q = {**_id_query(visit_id), "athlete_id": athlete_id}
    v = await db.visits.find_one(q, {"_id": 1, "legacy_check_id": 1})
    if not v:  # già eliminata (doppio tocco, o da un altro dispositivo): per l'app va bene così
        return {"message": "Visita già eliminata", "already": True}
    await db.visits.delete_one({"_id": v["_id"]})
    if v.get("legacy_check_id"):
        # ricorda che questo check era già stato copiato, così non ricompare con un nuovo import.
        # Se non si riesce a scriverlo (es. database pieno) la visita resta comunque eliminata.
        try:
            await db.visits_deleted_checks.update_one(
                {"athlete_id": athlete_id, "legacy_check_id": v["legacy_check_id"]},
                {"$set": {"athlete_id": athlete_id, "legacy_check_id": v["legacy_check_id"]}}, upsert=True)
        except Exception as e:
            logger.warning("memo visita eliminata non salvato: %s", e)
    return {"message": "Visita eliminata"}

@api_router.get("/admin/athletes/{athlete_id}/visits/{visit_id}/report")
async def admin_visit_report(athlete_id: str, visit_id: str, user=Depends(require_admin)):
    v = await db.visits.find_one({"id": visit_id, "athlete_id": athlete_id}, {"_id": 0, "report_data": 1})
    if not v or not v.get("report_data"):
        raise HTTPException(status_code=404, detail="PDF non disponibile")
    return {"report_data": v["report_data"]}

@api_router.get("/athlete/visits")
async def athlete_list_visits(user=Depends(require_athlete)):
    await require_visits_beta(user.get("athlete_id"))
    return await list_visits_for(user.get("athlete_id"))

@api_router.get("/athlete/visits/{visit_id}/report")
async def athlete_visit_report(visit_id: str, user=Depends(require_athlete)):
    await require_visits_beta(user.get("athlete_id"))
    v = await db.visits.find_one({"id": visit_id, "athlete_id": user.get("athlete_id")}, {"_id": 0, "report_data": 1})
    if not v or not v.get("report_data"):
        raise HTTPException(status_code=404, detail="PDF non disponibile")
    return {"report_data": v["report_data"]}

# ---- Misurazione da casa (la fa l'atleta) ----
# Le foto vengono analizzate SUL TELEFONO dell'atleta: qui arrivano solo i numeri.
# Le foto arrivano solo se l'atleta sceglie di inviarle (dentro il PDF della misurazione).

class SelfMeasureData(BaseModel):
    weight: Optional[float] = None
    height: Optional[float] = None
    sex: Optional[str] = None
    photo_estimates: Dict[str, Any] = {}
    notes: Optional[str] = None
    report_data: Optional[str] = None

SELF_REPORT_MAX_CHARS = 3_000_000  # ~2 MB: due foto ridotte + pagina

def _today_rome() -> str:
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

@api_router.post("/athlete/visits/self")
async def athlete_self_measure(data: SelfMeasureData, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    await require_visits_beta(athlete_id)
    flags = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "beta_self_measure": 1})
    if not (flags or {}).get("beta_self_measure"):
        raise HTTPException(status_code=403, detail="\"Misurati da casa\" non è ancora attivo per te: chiedi al coach")
    if not data.height or not (100 <= data.height <= 230):
        raise HTTPException(status_code=400, detail="Inserisci un'altezza valida (in cm)")
    if data.weight is not None and data.weight > 0 and not (25 <= data.weight <= 300):
        raise HTTPException(status_code=400, detail="Peso non valido")
    estimates = _clean_numbers(data.photo_estimates)
    estimates = {k: v for k, v in estimates.items() if 5 <= v <= 250}
    if not estimates:
        raise HTTPException(status_code=400, detail="Nessuna misura: rifai la stima dalle foto")
    report = data.report_data or None
    if report and (not report.startswith("data:text/html;base64,") or len(report) > SELF_REPORT_MAX_CHARS):
        raise HTTPException(status_code=413, detail="Foto troppo pesanti: riprova senza inviare le foto")
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "name": 1})
    now = datetime.now(timezone.utc).isoformat()
    date = _today_rome()
    fields = {
        "date": date,
        "weight": data.weight if data.weight and data.weight > 0 else None,
        "height": data.height,
        "sex": data.sex if data.sex in ("M", "F") else None,
        "circumferences": {},
        "photo_estimates": estimates,
        "notes": (data.notes or "").strip()[:2000] or None,
        "source": "athlete",
        "has_report": bool(report),
        "updated_at": now,
    }
    # una sola misurazione da casa al giorno: se la rifà, sostituisce quella di oggi
    existing = await db.visits.find_one({"athlete_id": athlete_id, "date": date, "source": "athlete"}, {"_id": 0, "id": 1})
    if existing:
        update = {"$set": {**fields, "report_data": report}} if report else {"$set": fields, "$unset": {"report_data": ""}}
        await db.visits.update_one({"id": existing["id"]}, update)
        visit_id = existing["id"]
    else:
        visit_id = str(uuid.uuid4())
        doc = {"id": visit_id, "athlete_id": athlete_id, **fields, "created_at": now}
        if report:
            doc["report_data"] = report
        await db.visits.insert_one(doc)
        # avviso al coach (solo la prima volta nella giornata)
        await db.week_notifications.insert_one({
            "id": str(uuid.uuid4()), "athlete_id": athlete_id,
            "athlete_name": (athlete or {}).get("name", "Atleta"), "week_number": 0,
            "kind": "self_measure", "message": "Ha inviato una misurazione da casa (foto)",
            "created_at": now, "read": False,
        })
    return await db.visits.find_one({"id": visit_id}, LIST_PROJECTION)

@api_router.delete("/athlete/visits/{visit_id}")
async def athlete_delete_self_measure(visit_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    await require_visits_beta(athlete_id)
    result = await db.visits.delete_one({"id": visit_id, "athlete_id": athlete_id, "source": "athlete"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Puoi eliminare solo le misurazioni fatte da te")
    return {"message": "Misurazione eliminata"}

# ============ ADMIN VIEW CHECKS ============

@api_router.get("/admin/athletes/{athlete_id}/checks")
async def get_athlete_checks_admin(athlete_id: str, user=Depends(require_admin)):
    checks = await db.body_checks.find({"athlete_id": athlete_id}).sort("created_at", -1).to_list(1000)
    return await _with_ids(db.body_checks, checks)

@api_router.delete("/admin/athletes/{athlete_id}/checks/{check_id}")
async def admin_delete_check(athlete_id: str, check_id: str, user=Depends(require_admin)):
    """Il coach elimina un check peso/altezza dell'atleta. La sua eventuale copia nelle Visite resta."""
    c = await db.body_checks.find_one({**_id_query(check_id), "athlete_id": athlete_id}, {"_id": 1})
    if not c:
        return {"message": "Check già eliminato", "already": True}
    await db.body_checks.delete_one({"_id": c["_id"]})
    return {"message": "Check eliminato"}

@api_router.get("/admin/athletes/{athlete_id}/training-loads")
async def get_athlete_training_loads_admin(athlete_id: str, user=Depends(require_admin)):
    loads = await db.training_loads.find({"athlete_id": athlete_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return loads

# ============ EXERCISE VIDEO LIBRARY ============

@api_router.get("/admin/exercise-videos")
async def get_exercise_videos_admin(q: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    videos = await db.exercise_videos.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return videos

@api_router.post("/admin/exercise-videos")
async def create_exercise_video(data: ExerciseVideoCreate, user=Depends(require_admin)):
    video = ExerciseVideo(name=data.name, video_url=data.video_url)
    await db.exercise_videos.insert_one(video.model_dump())
    return {"id": video.id, "name": video.name, "video_url": video.video_url, "created_at": video.created_at}

@api_router.delete("/admin/exercise-videos/{video_id}")
async def delete_exercise_video(video_id: str, user=Depends(require_admin)):
    result = await db.exercise_videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video esercizio non trovato")
    return {"message": "Video esercizio eliminato"}

@api_router.get("/athlete/exercise-videos")
async def get_exercise_videos_athlete(q: Optional[str] = None, user=Depends(require_athlete)):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    videos = await db.exercise_videos.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return videos

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Coach Athletes API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ============ VIDEO ROUTES (ATHLETE) ============

@api_router.get("/athlete/videos")
async def get_athlete_videos(light: bool = False, user=Depends(require_athlete)):
    """light=true -> elenco senza il contenuto dei video (solo titolo, data, visibilità)."""
    athlete_id = user.get("athlete_id")
    projection = {"_id": 0, "video_data": 0} if light else {"_id": 0}
    videos = await db.videos.find({"athlete_id": athlete_id}, projection).sort("created_at", -1).to_list(100)
    return videos

@api_router.post("/athlete/videos")
async def upload_video(data: VideoCreate, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    # MongoDB accetta documenti fino a 16 MB: oltre, il salvataggio fallirebbe comunque
    if len(data.video_data or "") > VIDEO_MAX_CHARS:
        mb = round(len(data.video_data) * 3 / 4 / 1048576, 1)
        raise HTTPException(status_code=413, detail=f"Video troppo grande ({mb} MB). Il limite è circa 11 MB: accorcialo o aggiorna l'app, che lo comprime in automatico.")
    video = VideoUpload(
        video_data=data.video_data,
        title=data.title,
        visible_to_coach=data.visible_to_coach
    )
    video_doc = video.model_dump()
    video_doc["athlete_id"] = athlete_id
    await db.videos.insert_one(video_doc)
    return {"id": video.id, "title": video.title, "visible_to_coach": video.visible_to_coach, "created_at": video.created_at}

@api_router.put("/athlete/videos/{video_id}/visibility")
async def toggle_video_visibility(video_id: str, visible: bool, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    await db.videos.update_one(
        {"id": video_id, "athlete_id": athlete_id},
        {"$set": {"visible_to_coach": visible}}
    )
    return {"message": "Visibilità aggiornata", "visible_to_coach": visible}

@api_router.delete("/athlete/videos/{video_id}")
async def delete_video(video_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    result = await db.videos.delete_one({"id": video_id, "athlete_id": athlete_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video non trovato")
    # Also delete annotations
    await db.video_annotations.delete_many({"video_id": video_id})
    return {"message": "Video eliminato"}

# ============ VIDEO ROUTES (ADMIN) ============

@api_router.get("/admin/athletes/{athlete_id}/videos")
async def get_athlete_videos_admin(athlete_id: str, user=Depends(require_admin)):
    videos = await db.videos.find(
        {"athlete_id": athlete_id, "visible_to_coach": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return videos

@api_router.get("/admin/videos/{video_id}/annotations")
async def get_video_annotations(video_id: str, user=Depends(require_admin)):
    annotations = await db.video_annotations.find(
        {"video_id": video_id},
        {"_id": 0}
    ).sort("frame_time", 1).to_list(1000)
    return annotations

@api_router.post("/admin/videos/{video_id}/annotations")
async def create_annotation(video_id: str, data: AnnotationCreate, user=Depends(require_admin)):
    annotation = VideoAnnotation(
        video_id=video_id,
        frame_time=data.frame_time,
        drawing_data=data.drawing_data,
        notes=data.notes
    )
    annotation_doc = annotation.model_dump()
    await db.video_annotations.insert_one(annotation_doc)
    # Return clean response without MongoDB ObjectId
    return {
        "id": annotation.id,
        "video_id": annotation.video_id,
        "frame_time": annotation.frame_time,
        "drawing_data": annotation.drawing_data,
        "notes": annotation.notes,
        "created_at": annotation.created_at
    }

@api_router.delete("/admin/annotations/{annotation_id}")
async def delete_annotation(annotation_id: str, user=Depends(require_admin)):
    result = await db.video_annotations.delete_one({"id": annotation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Annotazione non trovata")
    return {"message": "Annotazione eliminata"}

# Get annotations for athlete to view coach feedback
@api_router.get("/athlete/videos/{video_id}/annotations")
async def get_video_annotations_athlete(video_id: str, user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    # Verify video belongs to athlete
    video = await db.videos.find_one({"id": video_id, "athlete_id": athlete_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video non trovato")

    annotations = await db.video_annotations.find(
        {"video_id": video_id},
        {"_id": 0}
    ).sort("frame_time", 1).to_list(1000)
    return annotations



# ============ SPAZIO DATABASE ============
# Atlas (piano gratuito, 512 MB) conta dataSize + indexSize: i dati "in chiaro", non quelli compressi su disco.
STORAGE_LIMIT_MB = int(os.environ.get("STORAGE_LIMIT_MB", "512"))
VIDEO_MAX_CHARS = 15_500_000  # ~11,6 MB di video (base64 + campi) sotto il limite di 16 MB per documento

SECTION_LABELS = {
    "videos": "Video atleti", "photos": "Foto check", "diets": "Diete (PDF e tabelle)",
    "visits": "Visite (beta) con PDF", "training_history": "Storico programmi (PDF)",
    "trainings": "Programmi di allenamento", "training_loads": "Carichi atleti",
    "video_annotations": "Annotazioni video", "body_checks": "Check peso/altezza",
    "notes": "Note", "macros": "Macro", "athletes": "Atleti", "users": "Account",
    "exercise_videos": "Libreria esercizi", "week_notifications": "Notifiche settimana",
    "expiry_notifications": "Notifiche scadenze", "loads": "Carichi (vecchia versione)",
    "visits_deleted_checks": "Visite (memo import)",
}

def _bson_len(doc) -> int:
    try:
        import bson
        return len(bson.BSON.encode(doc))
    except Exception:
        return len(json.dumps(doc, default=str))

async def _collection_size(name: str):
    """(byte dati + indici, numero documenti)"""
    try:
        st = await db.command("collStats", name)
        return int(st.get("size", 0)) + int(st.get("totalIndexSize", 0)), int(st.get("count", 0))
    except Exception:
        total, count = 0, 0
        async for d in db[name].find({}):
            total += _bson_len(d)
            count += 1
        return total, count

async def _field_sizes(collection: str, field: str, query: dict, extra: dict = None, min_chars: int = 0, limit: int = 0):
    """Dimensione (in caratteri) di un campo grosso per ogni documento, SENZA scaricare il contenuto.
    Ritorna lista di dict {id, size, ...extra}."""
    project = {"_id": 0, "id": 1, "size": {"$strLenBytes": {"$ifNull": ["$" + field, ""]}}}
    for k in (extra or {}):
        project[k] = 1
    pipeline = [{"$match": query}, {"$project": project}]
    if min_chars:
        pipeline.append({"$match": {"size": {"$gt": min_chars}}})
    pipeline.append({"$sort": {"size": -1}})
    if limit:
        pipeline.append({"$limit": limit})
    try:
        return await db[collection].aggregate(pipeline).to_list(5000)
    except Exception:
        out = []
        async for d in db[collection].find(query):
            size = len(d.get(field) or "")
            if size > min_chars:
                item = {"id": d.get("id"), "size": size}
                for k in (extra or {}):
                    item[k] = d.get(k)
                out.append(item)
        out.sort(key=lambda x: -x["size"])
        return out[:limit] if limit else out

def _mb(n) -> float:
    return round((n or 0) / 1048576, 2)

@api_router.get("/admin/storage-stats")
async def get_storage_stats(user=Depends(require_admin)):
    """Spazio usato come lo calcola Atlas, con il dettaglio per sezione."""
    sections = []
    total = 0
    try:
        names = await db.list_collection_names()
    except Exception:
        names = list(SECTION_LABELS.keys())
    for name in names:
        size, count = await _collection_size(name)
        total += size
        sections.append({"key": name, "label": SECTION_LABELS.get(name, name), "mb": _mb(size), "count": count})
    try:
        st = await db.command("dbStats")
        total = int(st.get("dataSize", 0)) + int(st.get("indexSize", 0))
    except Exception:
        pass
    sections.sort(key=lambda x: -x["mb"])
    total_mb = _mb(total)
    return {
        "total_mb": total_mb, "limit_mb": STORAGE_LIMIT_MB,
        "percent": round(total_mb / STORAGE_LIMIT_MB * 100, 1),
        "sections": sections,
        # compatibilità con la versione precedente della dashboard
        "collections": {sct["key"]: int(sct["mb"] * 1048576) for sct in sections},
    }

@api_router.get("/admin/storage/overview")
async def storage_overview(user=Depends(require_admin)):
    """Cosa si può alleggerire, senza modificare nulla."""
    athletes = {a["id"]: a.get("name", "") async for a in db.athletes.find({}, {"_id": 0, "id": 1, "name": 1})}

    big_photos = await _field_sizes("photos", "image_data", {"optimized": {"$ne": True}}, min_chars=PHOTO_COMPRESS_OVER)
    photos_bytes = sum(p["size"] for p in big_photos)

    vids = await _field_sizes("videos", "video_data", {}, extra={"athlete_id": 1, "title": 1, "created_at": 1, "visible_to_coach": 1})
    ann_counts = {}
    try:
        async for r in db.video_annotations.aggregate([{"$group": {"_id": "$video_id", "n": {"$sum": 1}}}]):
            ann_counts[r["_id"]] = r["n"]
    except Exception:
        pass
    visible, private_by_athlete = [], {}
    for v in vids:
        name = athletes.get(v.get("athlete_id"), "Atleta eliminato")
        if v.get("visible_to_coach"):
            visible.append({"id": v["id"], "athlete": name, "title": v.get("title"), "created_at": v.get("created_at"),
                            "mb": _mb(v["size"] * 3 / 4), "annotations": ann_counts.get(v["id"], 0)})
        else:
            agg = private_by_athlete.setdefault(name, {"athlete": name, "count": 0, "mb": 0})
            agg["count"] += 1
            agg["mb"] = round(agg["mb"] + _mb(v["size"] * 3 / 4), 2)

    legacy = await _field_sizes("diets", "pdf_data", {"pdf_data": {"$nin": [None, ""]}}, extra={"athlete_id": 1})
    legacy_bytes = sum(d["size"] for d in legacy)

    return {
        "photos": {"count": len(big_photos), "mb": _mb(photos_bytes), "estimated_saving_mb": _mb(photos_bytes * 0.8)},
        "videos": {"visible": visible, "visible_mb": round(sum(v["mb"] for v in visible), 2),
                   "private": sorted(private_by_athlete.values(), key=lambda x: -x["mb"])},
        "legacy_diet_pdf": {"count": len(legacy), "mb": _mb(legacy_bytes),
                            "athletes": [athletes.get(d.get("athlete_id"), "?") for d in legacy]},
    }

class CompressRequest(BaseModel):
    limit: int = 15

@api_router.post("/admin/storage/compress-photos")
async def storage_compress_photos(data: CompressRequest = None, user=Depends(require_admin)):
    """Comprime un blocco di foto pesanti (da richiamare finché remaining = 0)."""
    limit = max(1, min((data.limit if data else 15), 40))
    candidates = await _field_sizes("photos", "image_data", {"optimized": {"$ne": True}}, min_chars=PHOTO_COMPRESS_OVER, limit=limit)
    processed, saved = 0, 0
    for c in candidates:
        doc = await db.photos.find_one({"id": c["id"]}, {"_id": 1, "image_data": 1})
        if not doc:
            continue
        new_url, gain = await asyncio.to_thread(_compress_image_data_url, doc.get("image_data") or "")
        update = {"optimized": True}
        if new_url:
            update["image_data"] = new_url
            saved += gain
        await db.photos.update_one({"_id": doc["_id"]}, {"$set": update})
        processed += 1
    remaining = len(await _field_sizes("photos", "image_data", {"optimized": {"$ne": True}}, min_chars=PHOTO_COMPRESS_OVER))
    return {"processed": processed, "saved_mb": _mb(saved), "remaining": remaining}

@api_router.get("/admin/videos/{video_id}/file")
async def admin_get_video_file(video_id: str, user=Depends(require_admin)):
    """Un singolo video condiviso col coach (per scaricarlo prima di eliminarlo)."""
    v = await db.videos.find_one({"id": video_id, "visible_to_coach": True}, {"_id": 0, "id": 1, "title": 1, "video_data": 1, "created_at": 1})
    if not v:
        raise HTTPException(status_code=404, detail="Video non trovato")
    return v

@api_router.delete("/admin/videos/{video_id}")
async def admin_delete_video(video_id: str, user=Depends(require_admin)):
    """Il coach elimina un video che l'atleta gli ha condiviso (con le sue annotazioni)."""
    result = await db.videos.delete_one({"id": video_id, "visible_to_coach": True})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video non trovato")
    await db.video_annotations.delete_many({"video_id": video_id})
    return {"message": "Video eliminato"}

@api_router.post("/admin/storage/clear-legacy-diet-pdf")
async def storage_clear_legacy_diet_pdf(user=Depends(require_admin)):
    """Elimina il vecchio PDF dieta 'singolo' (campo pdf_data), che l'app non mostra più a nessuno.
    I PDF della dieta attuali (elenco 'PDF Dieta') non vengono toccati."""
    result = await db.diets.update_many({"pdf_data": {"$nin": [None, ""]}}, {"$set": {"pdf_data": None}})
    return {"cleared": result.modified_count}

# ============ STRUCTURED DIET ============

@api_router.put("/admin/athletes/{athlete_id}/diet/structured")
async def update_structured_diet(athlete_id: str, data: DietStructured, user=Depends(require_admin)):
    diet_doc = {
        "athlete_id": athlete_id,
        "structured": data.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.diets.update_one({"athlete_id": athlete_id}, {"$set": diet_doc}, upsert=True)
    return {"message": "Dieta strutturata aggiornata"}

@api_router.get("/admin/athletes/{athlete_id}/diet/structured")
async def get_structured_diet(athlete_id: str, user=Depends(require_admin)):
    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0})
    if not diet or not diet.get("structured"):
        return {"giorni": [], "visible_to_athlete": True}
    return diet["structured"]


# ============ MACROS ============

class MacroTarget(BaseModel):
    kcal: Optional[float] = None
    proteine: Optional[float] = None
    carboidrati: Optional[float] = None
    grassi: Optional[float] = None
    note: Optional[str] = None
    data_inizio: Optional[str] = None
    visible_to_athlete: bool = True

@api_router.put("/admin/athletes/{athlete_id}/macros")
async def update_macros(athlete_id: str, data: MacroTarget, user=Depends(require_admin)):
    doc = {"athlete_id": athlete_id, **data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.macros.update_one({"athlete_id": athlete_id}, {"$set": doc}, upsert=True)
    return {"message": "Macro aggiornati"}

@api_router.get("/admin/athletes/{athlete_id}/macros")
async def get_macros_admin(athlete_id: str, user=Depends(require_admin)):
    doc = await db.macros.find_one({"athlete_id": athlete_id}, {"_id": 0})
    return doc or {}

@api_router.get("/athlete/macros")
async def get_macros_athlete(user=Depends(require_athlete)):
    athlete_id = user.get("athlete_id")
    doc = await db.macros.find_one({"athlete_id": athlete_id}, {"_id": 0})
    if not doc or not doc.get("visible_to_athlete", True):
        return {}
    return doc

# ============ ALIMENTI, CREA E PIANO ALIMENTARE ============
import nutrition as nut

class FoodIn(BaseModel):
    name: str
    kcal: Optional[Any] = None
    carbs: Optional[Any] = None
    sugars: Optional[Any] = None
    protein: Optional[Any] = None
    fat: Optional[Any] = None
    saturated: Optional[Any] = None
    fiber: Optional[Any] = None
    sodium: Optional[Any] = None
    notes: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    crea_code: Optional[str] = None

class FoodPatch(BaseModel):
    name: Optional[str] = None
    kcal: Optional[Any] = None
    carbs: Optional[Any] = None
    sugars: Optional[Any] = None
    protein: Optional[Any] = None
    fat: Optional[Any] = None
    saturated: Optional[Any] = None
    fiber: Optional[Any] = None
    sodium: Optional[Any] = None
    notes: Optional[str] = None
    category: Optional[str] = None

class FoodImport(BaseModel):
    items: List[Dict[str, Any]]
    on_duplicate: str = "update"  # "update" | "skip"

class CreaPick(BaseModel):
    code: str

FOOD_PROJECTION = {"_id": 0, "name_key": 0}

@api_router.get("/admin/foods")
async def list_foods(user=Depends(require_admin)):
    return await db.foods.find({}, FOOD_PROJECTION).sort("name_key", 1).to_list(5000)

@api_router.post("/admin/foods")
async def create_food(data: FoodIn, user=Depends(require_admin)):
    food = nut.clean_food(data.model_dump())
    if not food["name"]:
        raise HTTPException(status_code=400, detail="Scrivi il nome dell'alimento")
    key = nut.norm(food["name"])
    if await db.foods.find_one({"name_key": key}, {"_id": 1}):
        raise HTTPException(status_code=409, detail=f"\"{food['name']}\" è già nel database")
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), **food, "source": food.get("source") or "manuale", "name_key": key, "created_at": now, "updated_at": now}
    await db.foods.insert_one(doc)
    return await db.foods.find_one({"id": doc["id"]}, FOOD_PROJECTION)

@api_router.put("/admin/foods/{food_id}")
async def update_food(food_id: str, data: FoodPatch, user=Depends(require_admin)):
    current = await db.foods.find_one({"id": food_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Alimento non trovato")
    sent = data.model_dump(exclude_unset=True)
    merged = nut.clean_food({**current, **sent})
    update = {k: merged[k] for k in sent if k in merged}
    if "name" in update:
        if not update["name"]:
            raise HTTPException(status_code=400, detail="Il nome non può essere vuoto")
        key = nut.norm(update["name"])
        clash = await db.foods.find_one({"name_key": key, "id": {"$ne": food_id}}, {"_id": 1})
        if clash:
            raise HTTPException(status_code=409, detail=f"\"{update['name']}\" è già nel database")
        update["name_key"] = key
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.foods.update_one({"id": food_id}, {"$set": update})
    return await db.foods.find_one({"id": food_id}, FOOD_PROJECTION)

@api_router.delete("/admin/foods/{food_id}")
async def delete_food(food_id: str, user=Depends(require_admin)):
    result = await db.foods.delete_one({"id": food_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alimento non trovato")
    return {"message": "Alimento eliminato"}

@api_router.post("/admin/foods/import")
async def import_foods(data: FoodImport, user=Depends(require_admin)):
    """Import da Notion/CSV/Excel: l'app legge il file e manda le righe già abbinate alle colonne.
    I doppioni (stesso nome, anche con maiuscole/accenti diversi) si aggiornano o si saltano."""
    if len(data.items) > 5000:
        raise HTTPException(status_code=400, detail="Massimo 5000 alimenti per volta")
    existing = {d["name_key"]: d["id"] async for d in db.foods.find({}, {"_id": 0, "name_key": 1, "id": 1})}
    now = datetime.now(timezone.utc).isoformat()
    created = updated = skipped = errors = 0
    seen = set()
    for raw in data.items:
        food = nut.clean_food({**raw, "source": raw.get("source") or "import"})
        key = nut.norm(food["name"])
        if not key or all(food[f] is None for f in nut.FOOD_FIELDS):
            errors += 1
            continue
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        if key in existing:
            if data.on_duplicate == "skip":
                skipped += 1
                continue
            update = {f: food[f] for f in nut.FOOD_FIELDS if food[f] is not None}
            for k in ("notes", "category"):
                if food.get(k):
                    update[k] = food[k]
            update["updated_at"] = now
            await db.foods.update_one({"id": existing[key]}, {"$set": update})
            updated += 1
        else:
            fid = str(uuid.uuid4())
            await db.foods.insert_one({"id": fid, **food, "name_key": key, "created_at": now, "updated_at": now})
            existing[key] = fid
            created += 1
    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}

@api_router.get("/athlete/foods")
async def athlete_foods(user=Depends(require_athlete)):
    """Database alimenti del coach, in sola lettura: serve al calcolatore delle porzioni nell'app."""
    proj = {"_id": 0, "id": 1, "name": 1, "source": 1, **{f: 1 for f in nut.FOOD_FIELDS}}
    return await db.foods.find({}, proj).sort("name_key", 1).to_list(5000)

# ---- CREA (www.alimentinutrizione.it): ricerca e scheda, con la fonte sempre citata ----
CREA_INDEX_MAX_AGE_DAYS = 30
CREA_HEADERS = {"User-Agent": "LC-Performance/1.0 (app di coaching; ricerca alimenti con fonte CREA citata)",
                "Accept-Language": "it-IT,it;q=0.9"}

async def _crea_fetch(path: str) -> str:
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20, headers=CREA_HEADERS, follow_redirects=True) as http:
            r = await http.get(nut.CREA_BASE + path)
    except Exception as e:
        logger.warning("CREA non raggiungibile: %s", e)
        raise HTTPException(status_code=502, detail="Il sito CREA non risponde: riprova tra poco")
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Scheda CREA non trovata")
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Il sito CREA ha risposto con un errore ({r.status_code})")
    return r.text

async def _crea_index(force: bool = False) -> List[Dict[str, str]]:
    doc = await db.crea_cache.find_one({"_id": "index"})
    fresh = False
    if doc and not force:
        try:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(doc["fetched_at"])
            fresh = age.days < CREA_INDEX_MAX_AGE_DAYS
        except Exception:
            fresh = False
    if doc and fresh:
        return doc["items"]
    try:
        page = await _crea_fetch("/tabelle-nutrizionali/ricerca-per-ordine-alfabetico")
        items = nut.parse_crea_index(page)
    except HTTPException:
        if doc:  # sito giù: uso l'elenco che ho già
            return doc["items"]
        raise
    if len(items) < 50:
        if doc:
            return doc["items"]
        raise HTTPException(status_code=502, detail="Non riesco a leggere l'elenco degli alimenti CREA")
    await db.crea_cache.update_one({"_id": "index"}, {"$set": {"items": items, "fetched_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return items

async def _crea_food(code: str) -> Dict[str, Any]:
    code = (code or "").strip().upper()
    if not nut.CODE_RE.match(code):
        raise HTTPException(status_code=400, detail="Codice CREA non valido")
    cached = await db.crea_cache.find_one({"_id": f"food:{code}"}, {"_id": 0})
    if cached and cached.get("food"):
        return cached["food"]
    page = await _crea_fetch(f"/tabelle-nutrizionali/{code}")
    try:
        food = nut.parse_crea_food(page, code)
    except ValueError:
        raise HTTPException(status_code=502, detail="Non riesco a leggere questa scheda CREA: aprila dal link e inserisci i valori a mano")
    await db.crea_cache.update_one({"_id": f"food:{code}"}, {"$set": {"food": food, "fetched_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return food

@api_router.get("/admin/crea/search")
async def crea_search(q: str = "", user=Depends(require_admin)):
    if len(nut.norm(q)) < 2:
        return {"results": [], "citation": nut.CREA_CITATION}
    items = await _crea_index()
    return {"results": nut.search_index(items, q, 25), "citation": nut.CREA_CITATION}

@api_router.get("/admin/crea/food/{code}")
async def crea_food(code: str, user=Depends(require_admin)):
    return await _crea_food(code)

@api_router.post("/admin/foods/from-crea")
async def food_from_crea(data: CreaPick, user=Depends(require_admin)):
    """Aggiunge (o aggiorna) nel database l'alimento scelto dal CREA, con fonte e codice."""
    crea = await _crea_food(data.code)
    food = nut.clean_food({**crea, "source": "CREA", "notes": f"Fonte: CREA {crea.get('crea_code')}"})
    key = nut.norm(food["name"])
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.foods.find_one({"$or": [{"crea_code": food["crea_code"]}, {"name_key": key}]}, {"_id": 0, "id": 1})
    if existing:
        await db.foods.update_one({"id": existing["id"]}, {"$set": {**{f: food[f] for f in nut.FOOD_FIELDS}, "source": "CREA",
                                                                    "crea_code": food["crea_code"], "category": food.get("category"), "updated_at": now}})
        fid = existing["id"]
    else:
        fid = str(uuid.uuid4())
        await db.foods.insert_one({"id": fid, **food, "name_key": key, "created_at": now, "updated_at": now})
    return await db.foods.find_one({"id": fid}, FOOD_PROJECTION)

# ---- Piano alimentare (dieta completa o solo macro) ----
PLAN_MAX_BYTES = 600_000
LOGO_PATH = str(ROOT_DIR / "assets" / "lc-logo.png")

class PlanPdfRequest(BaseModel):
    send: bool = False      # True = aggiunge il PDF all'elenco "PDF Dieta" dell'atleta
    name: Optional[str] = None

@api_router.get("/admin/athletes/{athlete_id}/diet/plan")
async def get_diet_plan(athlete_id: str, user=Depends(require_admin)):
    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0, "plan": 1, "plan_published_at": 1})
    plan = (diet or {}).get("plan")
    return {**plan, "published_at": diet.get("plan_published_at")} if plan else {}

@api_router.put("/admin/athletes/{athlete_id}/diet/plan")
async def save_diet_plan(athlete_id: str, data: Dict[str, Any], user=Depends(require_admin)):
    if len(json.dumps(data, default=str)) > PLAN_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Piano troppo grande")
    if not await db.athletes.find_one({"id": athlete_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Atleta non trovato")
    plan = nut.clean_plan(data)
    plan["updated_at"] = datetime.now(timezone.utc).isoformat()
    # "Salva" = bozza del coach: l'atleta continua a vedere l'ultimo piano inviato
    await db.diets.update_one({"athlete_id": athlete_id}, {"$set": {"plan": plan}}, upsert=True)
    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0, "plan_published_at": 1})
    return {**plan, "published_at": (diet or {}).get("plan_published_at")}

@api_router.post("/admin/athletes/{athlete_id}/diet/plan/pdf")
async def diet_plan_pdf(athlete_id: str, data: PlanPdfRequest, user=Depends(require_admin)):
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "name": 1})
    if not athlete:
        raise HTTPException(status_code=404, detail="Atleta non trovato")
    diet = await db.diets.find_one({"athlete_id": athlete_id}, {"_id": 0, "plan": 1})
    plan = (diet or {}).get("plan")
    if not plan:
        raise HTTPException(status_code=400, detail="Salva prima il piano")
    logo = LOGO_PATH if os.path.exists(LOGO_PATH) else None
    pdf = await asyncio.to_thread(nut.build_plan_pdf, plan, athlete.get("name", "Atleta"), logo, nut.plan_uses_crea(plan))
    data_url = "data:application/pdf;base64," + base64.b64encode(pdf).decode()
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    name = (data.name or "").strip()[:80] or (f"Macro - {today}" if plan.get("mode") == "macro" else f"Piano alimentare - {today}")
    published_at = None
    if data.send:
        # "Invia all'atleta": il PDF va nei suoi PDF dieta e il piano diventa quello che vede nell'app
        published_at = datetime.now(timezone.utc).isoformat()
        await db.diets.update_one({"athlete_id": athlete_id}, {
            "$set": {"plan_published": plan, "plan_published_at": published_at},
            "$push": {"pdfs": {"name": name, "pdf_data": data_url, "generated": True, "created_at": published_at}}},
            upsert=True)
        # "Solo macro": tengo allineato anche il riquadro macro (che fa partire l'avviso dei 28 giorni).
        # Primo tipo di giorno = valori principali.
        if plan.get("mode") == "macro" and (plan.get("macro") or {}).get("days"):
            d0 = plan["macro"]["days"][0]
            await db.macros.update_one({"athlete_id": athlete_id}, {"$set": {
                "athlete_id": athlete_id, "kcal": round(nut.macro_kcal(d0)) or None, "proteine": d0.get("protein"),
                "carboidrati": d0.get("carbs"), "grassi": d0.get("fat"), "note": plan.get("notes") or None,
                "data_inizio": plan.get("start_date"), "updated_at": published_at}}, upsert=True)
    return {"name": name, "pdf_data": data_url, "sent": data.send, "size": len(pdf), "published_at": published_at}

# ============ TRAINING HISTORY ============

class ArchiveTrainingRequest(BaseModel):
    pdf_data: Optional[str] = None  # Base64 PDF generated on frontend

@api_router.post("/admin/athletes/{athlete_id}/training/archive")
async def archive_training(athlete_id: str, data: ArchiveTrainingRequest = None, user=Depends(require_admin)):
    """Archive current training program as PDF (compact storage)"""
    training = await db.trainings.find_one({"athlete_id": athlete_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Nessun programma attivo")
    archive_doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_name": training.get("program_name", "Programma"),
        "num_weeks": training.get("num_weeks", 4),
        # Store as PDF only (no days JSON = much less storage)
        "pdf_data": data.pdf_data if data and data.pdf_data else None,
        "archived_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.training_history.insert_one(archive_doc)
    # Clear current training
    await db.trainings.update_one(
        {"athlete_id": athlete_id},
        {"$set": {"program_name": "", "days": [], "num_weeks": 4, "athlete_id": athlete_id}},
        upsert=True
    )
    # I carichi dell'atleta sono ora dentro il PDF archiviato (con la progressione W1 -> ultima settimana):
    # li cancelliamo dal database per liberare spazio e far partire il nuovo programma da zero.
    # Si cancellano solo se l'archivio contiene davvero il PDF.
    deleted_loads = 0
    if archive_doc["pdf_data"]:
        r1 = await db.training_loads.delete_many({"athlete_id": athlete_id})
        r2 = await db.loads.delete_many({"athlete_id": athlete_id})
        deleted_loads = r1.deleted_count + r2.deleted_count
    return {"message": "Programma archiviato", "id": archive_doc["id"], "deleted_loads": deleted_loads}

@api_router.get("/admin/athletes/{athlete_id}/training/history")
async def get_training_history(athlete_id: str, user=Depends(require_admin)):
    history = await db.training_history.find({"athlete_id": athlete_id}, {"_id": 0}).sort("archived_at", -1).to_list(100)
    return history

@api_router.delete("/admin/athletes/{athlete_id}/training/history/{history_id}")
async def delete_training_history(athlete_id: str, history_id: str, user=Depends(require_admin)):
    await db.training_history.delete_one({"id": history_id, "athlete_id": athlete_id})
    return {"message": "Programma eliminato dallo storico"}

@api_router.post("/admin/athletes/{athlete_id}/training/restore/{history_id}")
async def restore_training(athlete_id: str, history_id: str, user=Depends(require_admin)):
    """Restore an archived training as current"""
    archived = await db.training_history.find_one({"id": history_id, "athlete_id": athlete_id}, {"_id": 0})
    if not archived:
        raise HTTPException(status_code=404, detail="Programma non trovato")
    await db.trainings.update_one(
        {"athlete_id": athlete_id},
        {"$set": {"program_name": archived["program_name"], "days": archived["days"], "athlete_id": athlete_id}},
        upsert=True
    )
    return {"message": "Programma ripristinato"}

# ============ CHANGE PASSWORD ============

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user=Depends(get_current_user)):
    db_user = await db.users.find_one({"id": user.get("id") or user.get("user_id")})
    if not db_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if not verify_password(data.current_password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Password attuale non corretta")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nuova password deve essere di almeno 6 caratteri")
    user_id = user.get("id") or user.get("user_id")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hash_password(data.new_password)}}
    )
    return {"message": "Password aggiornata con successo"}

# Compressione GZIP delle risposte: le risposte JSON (scheda, dieta, carichi) diventano
# 5-10 volte più piccole, fondamentale con rete scarsa.
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS - credentials=True incompatible with wildcard origins
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
