from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'talentos-secret-key-change-in-prod')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Encryption Key (32 bytes for AES-256)
_raw_key = os.environ.get('ENCRYPTION_KEY', 'talentos32byteencryptionkey!@#$')
ENCRYPTION_KEY = (_raw_key + '0' * 32)[:32].encode()  # Ensure exactly 32 bytes

# Create the main app
app = FastAPI(title="fleshsesh TalentOS API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENCRYPTION UTILITIES ====================

def encrypt_field(data: str) -> str:
    """Encrypt sensitive field using AES-256"""
    if not data:
        return ""
    iv = get_random_bytes(16)
    cipher = AES.new(ENCRYPTION_KEY, AES.MODE_GCM, nonce=iv)
    ciphertext, tag = cipher.encrypt_and_digest(data.encode('utf-8'))
    return base64.b64encode(iv + tag + ciphertext).decode('utf-8')

def decrypt_field(encrypted_data: str) -> str:
    """Decrypt sensitive field"""
    if not encrypted_data:
        return ""
    try:
        raw = base64.b64decode(encrypted_data)
        iv = raw[:16]
        tag = raw[16:32]
        ciphertext = raw[32:]
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_GCM, nonce=iv)
        return cipher.decrypt_and_verify(ciphertext, tag).decode('utf-8')
    except Exception:
        return "[DECRYPTION_ERROR]"

# ==================== MODELS ====================

# User Roles
class UserRole:
    OWNER = "owner"
    OPS_DIRECTOR = "ops_director"
    TALENT_MANAGER = "talent_manager"
    MARKETING_OPS = "marketing_ops"
    FINANCE = "finance"
    SAFETY_SUPPORT = "safety_support"

ROLE_PERMISSIONS = {
    UserRole.OWNER: ["*"],
    UserRole.OPS_DIRECTOR: ["talents", "personas", "onboarding", "consent", "content", "revenue", "incidents", "tasks"],
    UserRole.TALENT_MANAGER: ["talents:assigned", "personas:assigned", "onboarding", "consent:view", "wellbeing"],
    UserRole.MARKETING_OPS: ["personas:view", "content", "marketing"],
    UserRole.FINANCE: ["revenue"],
    UserRole.SAFETY_SUPPORT: ["incidents", "wellbeing"]
}

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.TALENT_MANAGER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Talent Models (with encrypted fields)
class TalentCreate(BaseModel):
    legal_name: str  # Will be encrypted
    dob: str  # Will be encrypted (date of birth)
    emergency_contact: Optional[str] = None  # Will be encrypted
    verification_status: str = "pending"
    notes: Optional[str] = None

class TalentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    display_id: str  # Non-sensitive identifier
    verification_status: str
    onboarding_complete: bool
    readiness_score: int
    persona_count: int
    created_at: str
    updated_at: str

class TalentDetailResponse(TalentResponse):
    legal_name_encrypted: bool = True  # Indicates field is encrypted
    dob_encrypted: bool = True
    emergency_contact_encrypted: bool = True
    notes: Optional[str] = None

class TalentDecryptedResponse(TalentResponse):
    legal_name: str
    dob: str
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None

# Persona Models
class PersonaCreate(BaseModel):
    talent_id: str
    persona_name: str
    branding_tone: str
    niche_tags: List[str] = []
    allowed_platforms: List[str] = []
    prohibited_acts: List[str] = []
    pricing_tier: str = "standard"
    risk_rating: int = 0  # 0-100

class PersonaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    talent_id: str
    persona_name: str
    branding_tone: str
    niche_tags: List[str]
    allowed_platforms: List[str]
    prohibited_acts: List[str]
    pricing_tier: str
    risk_rating: int
    status: str
    created_at: str
    updated_at: str

# Onboarding Models
class OnboardingStep(BaseModel):
    step_id: str
    name: str
    completed: bool = False
    completed_at: Optional[str] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None

class OnboardingCreate(BaseModel):
    talent_id: str

class OnboardingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    talent_id: str
    steps: List[Dict[str, Any]]
    overall_progress: int
    started_at: str
    completed_at: Optional[str] = None

# Consent Models
class ConsentCreate(BaseModel):
    persona_id: str
    act_type: str
    partner_ids: List[str] = []
    distribution_scope: str
    revocation_rules: str
    expiry_date: Optional[str] = None

class ConsentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    persona_id: str
    act_type: str
    partner_ids: List[str]
    distribution_scope: str
    revocation_rules: str
    status: str  # active, revoked, expired
    expiry_date: Optional[str] = None
    created_at: str
    revoked_at: Optional[str] = None

# Revenue Models
class RevenueEntry(BaseModel):
    persona_id: str
    platform: str
    amount: float
    currency: str = "USD"
    revenue_type: str  # subscription, ppv, tips, custom, experience
    notes: Optional[str] = None

class RevenueResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    persona_id: str
    platform: str
    amount: float
    currency: str
    revenue_type: str
    notes: Optional[str]
    recorded_at: str

# Incident Models
class IncidentCreate(BaseModel):
    persona_id: Optional[str] = None
    talent_id: Optional[str] = None
    incident_type: str  # boundary_violation, client_misconduct, platform_dispute, internal_escalation
    severity: str  # low, medium, high, critical
    description: str

class IncidentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    persona_id: Optional[str]
    talent_id: Optional[str]
    incident_type: str
    severity: str
    description: str
    status: str  # open, investigating, resolved, closed
    resolution_notes: Optional[str]
    created_at: str
    resolved_at: Optional[str]
    assigned_to: Optional[str]

# Wellbeing Models
class WellbeingCheckIn(BaseModel):
    talent_id: str
    mood_score: int  # 1-10
    stress_level: int  # 1-10
    notes: Optional[str] = None

class WellbeingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    talent_id: str
    mood_score: int
    stress_level: int
    notes: Optional[str]
    recorded_at: str
    recorded_by: str

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    persona_id: Optional[str] = None
    task_type: str  # platform_appeal, brand_deal, crisis_response, talent_request, general
    priority: str = "medium"  # low, medium, high, urgent
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str]
    persona_id: Optional[str]
    task_type: str
    priority: str
    status: str  # pending, in_progress, completed, blocked
    deadline: Optional[str]
    assigned_to: Optional[str]
    created_at: str
    completed_at: Optional[str]

# Dashboard Stats
class DashboardStats(BaseModel):
    total_talents: int
    total_personas: int
    active_incidents: int
    pending_tasks: int
    total_revenue_mtd: float
    onboarding_in_progress: int
    high_risk_personas: int

# ==================== AUTH HELPERS ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_permission(user: dict, required_permission: str):
    role = user.get("role", "")
    permissions = ROLE_PERMISSIONS.get(role, [])
    if "*" in permissions or required_permission in permissions:
        return True
    # Check for partial permissions like "talents:assigned"
    for perm in permissions:
        if perm.startswith(required_permission.split(":")[0]):
            return True
    raise HTTPException(status_code=403, detail="Insufficient permissions")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "role": role, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== ONBOARDING STEPS TEMPLATE ====================

ONBOARDING_STEPS = [
    {"step_id": "id_verified", "name": "ID Verified", "description": "Government ID verification complete"},
    {"step_id": "age_confirmed", "name": "Age Confirmed", "description": "Age verification (18+) confirmed"},
    {"step_id": "consent_framework", "name": "Consent Framework Signed", "description": "Master consent framework agreement signed"},
    {"step_id": "boundaries_defined", "name": "Boundaries Defined", "description": "Personal and professional boundaries documented"},
    {"step_id": "platform_suitability", "name": "Platform Suitability Checked", "description": "Platform compatibility assessment complete"},
    {"step_id": "safety_briefing", "name": "Safety Briefing Acknowledged", "description": "Safety protocols and emergency procedures reviewed"}
]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.role)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        created_at=now
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== TALENT ROUTES ====================

@api_router.post("/talents", response_model=TalentResponse)
async def create_talent(talent_data: TalentCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "talents")
    
    talent_id = str(uuid.uuid4())
    display_id = f"TL-{talent_id[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    talent_doc = {
        "id": talent_id,
        "display_id": display_id,
        "legal_name_encrypted": encrypt_field(talent_data.legal_name),
        "dob_encrypted": encrypt_field(talent_data.dob),
        "emergency_contact_encrypted": encrypt_field(talent_data.emergency_contact or ""),
        "verification_status": talent_data.verification_status,
        "notes": talent_data.notes,
        "onboarding_complete": False,
        "readiness_score": 0,
        "persona_count": 0,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user["id"]
    }
    
    await db.talents.insert_one(talent_doc)
    
    # Auto-create onboarding record
    onboarding_doc = {
        "id": str(uuid.uuid4()),
        "talent_id": talent_id,
        "steps": [{"step_id": s["step_id"], "name": s["name"], "completed": False, "completed_at": None, "completed_by": None} for s in ONBOARDING_STEPS],
        "overall_progress": 0,
        "started_at": now,
        "completed_at": None
    }
    await db.onboarding.insert_one(onboarding_doc)
    
    return TalentResponse(
        id=talent_id,
        display_id=display_id,
        verification_status=talent_data.verification_status,
        onboarding_complete=False,
        readiness_score=0,
        persona_count=0,
        created_at=now,
        updated_at=now
    )

@api_router.get("/talents", response_model=List[TalentResponse])
async def get_talents(current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "talents")
    
    talents = await db.talents.find({}, {"_id": 0, "legal_name_encrypted": 0, "dob_encrypted": 0, "emergency_contact_encrypted": 0}).to_list(1000)
    return [TalentResponse(**t) for t in talents]

@api_router.get("/talents/{talent_id}", response_model=TalentDecryptedResponse)
async def get_talent(talent_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "talents")
    
    talent = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    # Decrypt sensitive fields for authorized users
    return TalentDecryptedResponse(
        id=talent["id"],
        display_id=talent["display_id"],
        legal_name=decrypt_field(talent.get("legal_name_encrypted", "")),
        dob=decrypt_field(talent.get("dob_encrypted", "")),
        emergency_contact=decrypt_field(talent.get("emergency_contact_encrypted", "")) or None,
        verification_status=talent["verification_status"],
        onboarding_complete=talent.get("onboarding_complete", False),
        readiness_score=talent.get("readiness_score", 0),
        persona_count=talent.get("persona_count", 0),
        notes=talent.get("notes"),
        created_at=talent["created_at"],
        updated_at=talent["updated_at"]
    )

@api_router.put("/talents/{talent_id}", response_model=TalentResponse)
async def update_talent(talent_id: str, talent_data: TalentCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "talents")
    
    existing = await db.talents.find_one({"id": talent_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_doc = {
        "legal_name_encrypted": encrypt_field(talent_data.legal_name),
        "dob_encrypted": encrypt_field(talent_data.dob),
        "emergency_contact_encrypted": encrypt_field(talent_data.emergency_contact or ""),
        "verification_status": talent_data.verification_status,
        "notes": talent_data.notes,
        "updated_at": now
    }
    
    await db.talents.update_one({"id": talent_id}, {"$set": update_doc})
    
    updated = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    return TalentResponse(
        id=updated["id"],
        display_id=updated["display_id"],
        verification_status=updated["verification_status"],
        onboarding_complete=updated.get("onboarding_complete", False),
        readiness_score=updated.get("readiness_score", 0),
        persona_count=updated.get("persona_count", 0),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )

@api_router.delete("/talents/{talent_id}")
async def delete_talent(talent_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "talents")
    
    result = await db.talents.delete_one({"id": talent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    # Also delete related records
    await db.personas.delete_many({"talent_id": talent_id})
    await db.onboarding.delete_many({"talent_id": talent_id})
    
    return {"message": "Talent deleted successfully"}

# ==================== PERSONA ROUTES ====================

@api_router.post("/personas", response_model=PersonaResponse)
async def create_persona(persona_data: PersonaCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "personas")
    
    # Verify talent exists
    talent = await db.talents.find_one({"id": persona_data.talent_id})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    persona_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    persona_doc = {
        "id": persona_id,
        "talent_id": persona_data.talent_id,
        "persona_name": persona_data.persona_name,
        "branding_tone": persona_data.branding_tone,
        "niche_tags": persona_data.niche_tags,
        "allowed_platforms": persona_data.allowed_platforms,
        "prohibited_acts": persona_data.prohibited_acts,
        "pricing_tier": persona_data.pricing_tier,
        "risk_rating": persona_data.risk_rating,
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    await db.personas.insert_one(persona_doc)
    
    # Update talent persona count
    await db.talents.update_one({"id": persona_data.talent_id}, {"$inc": {"persona_count": 1}})
    
    return PersonaResponse(**persona_doc)

@api_router.get("/personas", response_model=List[PersonaResponse])
async def get_personas(talent_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "personas")
    
    query = {}
    if talent_id:
        query["talent_id"] = talent_id
    
    personas = await db.personas.find(query, {"_id": 0}).to_list(1000)
    return [PersonaResponse(**p) for p in personas]

@api_router.get("/personas/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "personas")
    
    persona = await db.personas.find_one({"id": persona_id}, {"_id": 0})
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    return PersonaResponse(**persona)

@api_router.put("/personas/{persona_id}", response_model=PersonaResponse)
async def update_persona(persona_id: str, persona_data: PersonaCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "personas")
    
    existing = await db.personas.find_one({"id": persona_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_doc = {
        "persona_name": persona_data.persona_name,
        "branding_tone": persona_data.branding_tone,
        "niche_tags": persona_data.niche_tags,
        "allowed_platforms": persona_data.allowed_platforms,
        "prohibited_acts": persona_data.prohibited_acts,
        "pricing_tier": persona_data.pricing_tier,
        "risk_rating": persona_data.risk_rating,
        "updated_at": now
    }
    
    await db.personas.update_one({"id": persona_id}, {"$set": update_doc})
    
    updated = await db.personas.find_one({"id": persona_id}, {"_id": 0})
    return PersonaResponse(**updated)

# ==================== ONBOARDING ROUTES ====================

@api_router.get("/onboarding/{talent_id}", response_model=OnboardingResponse)
async def get_onboarding(talent_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "onboarding")
    
    onboarding = await db.onboarding.find_one({"talent_id": talent_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding record not found")
    
    return OnboardingResponse(**onboarding)

@api_router.put("/onboarding/{talent_id}/step/{step_id}")
async def complete_onboarding_step(talent_id: str, step_id: str, notes: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "onboarding")
    
    onboarding = await db.onboarding.find_one({"talent_id": talent_id})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding record not found")
    
    now = datetime.now(timezone.utc).isoformat()
    steps = onboarding["steps"]
    
    for step in steps:
        if step["step_id"] == step_id:
            step["completed"] = True
            step["completed_at"] = now
            step["completed_by"] = current_user["id"]
            if notes:
                step["notes"] = notes
            break
    
    # Calculate progress
    completed_count = sum(1 for s in steps if s["completed"])
    progress = int((completed_count / len(steps)) * 100)
    
    completed_at = now if progress == 100 else None
    
    await db.onboarding.update_one(
        {"talent_id": talent_id},
        {"$set": {"steps": steps, "overall_progress": progress, "completed_at": completed_at}}
    )
    
    # Update talent readiness score and onboarding status
    await db.talents.update_one(
        {"id": talent_id},
        {"$set": {"readiness_score": progress, "onboarding_complete": progress == 100}}
    )
    
    return {"message": "Step completed", "progress": progress}

# ==================== CONSENT ROUTES ====================

@api_router.post("/consents", response_model=ConsentResponse)
async def create_consent(consent_data: ConsentCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "consent")
    
    consent_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    consent_doc = {
        "id": consent_id,
        "persona_id": consent_data.persona_id,
        "act_type": consent_data.act_type,
        "partner_ids": consent_data.partner_ids,
        "distribution_scope": consent_data.distribution_scope,
        "revocation_rules": consent_data.revocation_rules,
        "status": "active",
        "expiry_date": consent_data.expiry_date,
        "created_at": now,
        "created_by": current_user["id"],
        "revoked_at": None
    }
    
    await db.consents.insert_one(consent_doc)
    
    return ConsentResponse(**consent_doc)

@api_router.get("/consents", response_model=List[ConsentResponse])
async def get_consents(persona_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "consent")
    
    query = {}
    if persona_id:
        query["persona_id"] = persona_id
    if status:
        query["status"] = status
    
    consents = await db.consents.find(query, {"_id": 0}).to_list(1000)
    return [ConsentResponse(**c) for c in consents]

@api_router.put("/consents/{consent_id}/revoke")
async def revoke_consent(consent_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "consent")
    
    consent = await db.consents.find_one({"id": consent_id})
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.consents.update_one(
        {"id": consent_id},
        {"$set": {"status": "revoked", "revoked_at": now}}
    )
    
    # Flag related content
    await db.content.update_many(
        {"consent_id": consent_id},
        {"$set": {"flagged": True, "flag_reason": "Consent revoked"}}
    )
    
    return {"message": "Consent revoked successfully"}

# ==================== REVENUE ROUTES ====================

@api_router.post("/revenue", response_model=RevenueResponse)
async def record_revenue(revenue_data: RevenueEntry, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "revenue")
    
    revenue_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    revenue_doc = {
        "id": revenue_id,
        "persona_id": revenue_data.persona_id,
        "platform": revenue_data.platform,
        "amount": revenue_data.amount,
        "currency": revenue_data.currency,
        "revenue_type": revenue_data.revenue_type,
        "notes": revenue_data.notes,
        "recorded_at": now,
        "recorded_by": current_user["id"]
    }
    
    await db.revenue.insert_one(revenue_doc)
    
    return RevenueResponse(**revenue_doc)

@api_router.get("/revenue", response_model=List[RevenueResponse])
async def get_revenue(persona_id: Optional[str] = None, platform: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "revenue")
    
    query = {}
    if persona_id:
        query["persona_id"] = persona_id
    if platform:
        query["platform"] = platform
    
    revenues = await db.revenue.find(query, {"_id": 0}).to_list(1000)
    return [RevenueResponse(**r) for r in revenues]

@api_router.get("/revenue/summary")
async def get_revenue_summary(current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "revenue")
    
    # Get current month start
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    pipeline = [
        {"$match": {"recorded_at": {"$gte": month_start}}},
        {"$group": {
            "_id": {"platform": "$platform", "revenue_type": "$revenue_type"},
            "total": {"$sum": "$amount"}
        }}
    ]
    
    results = await db.revenue.aggregate(pipeline).to_list(100)
    
    summary = {"by_platform": {}, "by_type": {}, "total_mtd": 0}
    for r in results:
        platform = r["_id"]["platform"]
        rev_type = r["_id"]["revenue_type"]
        amount = r["total"]
        
        summary["by_platform"][platform] = summary["by_platform"].get(platform, 0) + amount
        summary["by_type"][rev_type] = summary["by_type"].get(rev_type, 0) + amount
        summary["total_mtd"] += amount
    
    return summary

# ==================== INCIDENT ROUTES ====================

@api_router.post("/incidents", response_model=IncidentResponse)
async def create_incident(incident_data: IncidentCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "incidents")
    
    incident_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    incident_doc = {
        "id": incident_id,
        "persona_id": incident_data.persona_id,
        "talent_id": incident_data.talent_id,
        "incident_type": incident_data.incident_type,
        "severity": incident_data.severity,
        "description": incident_data.description,
        "status": "open",
        "resolution_notes": None,
        "created_at": now,
        "resolved_at": None,
        "assigned_to": None,
        "created_by": current_user["id"]
    }
    
    await db.incidents.insert_one(incident_doc)
    
    return IncidentResponse(**incident_doc)

@api_router.get("/incidents", response_model=List[IncidentResponse])
async def get_incidents(status: Optional[str] = None, severity: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "incidents")
    
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    
    incidents = await db.incidents.find(query, {"_id": 0}).to_list(1000)
    return [IncidentResponse(**i) for i in incidents]

@api_router.put("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str, resolution_notes: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "incidents")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.incidents.update_one(
        {"id": incident_id},
        {"$set": {"status": "resolved", "resolution_notes": resolution_notes, "resolved_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return {"message": "Incident resolved"}

# ==================== WELLBEING ROUTES ====================

@api_router.post("/wellbeing", response_model=WellbeingResponse)
async def record_wellbeing(checkin_data: WellbeingCheckIn, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "wellbeing")
    
    checkin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    checkin_doc = {
        "id": checkin_id,
        "talent_id": checkin_data.talent_id,
        "mood_score": checkin_data.mood_score,
        "stress_level": checkin_data.stress_level,
        "notes": checkin_data.notes,
        "recorded_at": now,
        "recorded_by": current_user["id"]
    }
    
    await db.wellbeing.insert_one(checkin_doc)
    
    return WellbeingResponse(**checkin_doc)

@api_router.get("/wellbeing/{talent_id}", response_model=List[WellbeingResponse])
async def get_wellbeing_history(talent_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "wellbeing")
    
    checkins = await db.wellbeing.find({"talent_id": talent_id}, {"_id": 0}).sort("recorded_at", -1).to_list(50)
    return [WellbeingResponse(**c) for c in checkins]

# ==================== TASK ROUTES ====================

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "tasks")
    
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    task_doc = {
        "id": task_id,
        "title": task_data.title,
        "description": task_data.description,
        "persona_id": task_data.persona_id,
        "task_type": task_data.task_type,
        "priority": task_data.priority,
        "status": "pending",
        "deadline": task_data.deadline,
        "assigned_to": task_data.assigned_to,
        "created_at": now,
        "completed_at": None,
        "created_by": current_user["id"]
    }
    
    await db.tasks.insert_one(task_doc)
    
    return TaskResponse(**task_doc)

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(status: Optional[str] = None, priority: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "tasks")
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return [TaskResponse(**t) for t in tasks]

@api_router.put("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "tasks")
    
    now = datetime.now(timezone.utc).isoformat()
    update_doc = {"status": status}
    
    if status == "completed":
        update_doc["completed_at"] = now
    
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_doc})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task status updated"}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_talents = await db.talents.count_documents({})
    total_personas = await db.personas.count_documents({})
    active_incidents = await db.incidents.count_documents({"status": {"$in": ["open", "investigating"]}})
    pending_tasks = await db.tasks.count_documents({"status": "pending"})
    onboarding_in_progress = await db.talents.count_documents({"onboarding_complete": False})
    high_risk_personas = await db.personas.count_documents({"risk_rating": {"$gte": 70}})
    
    # Get MTD revenue
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    pipeline = [
        {"$match": {"recorded_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    revenue_result = await db.revenue.aggregate(pipeline).to_list(1)
    total_revenue_mtd = revenue_result[0]["total"] if revenue_result else 0
    
    return DashboardStats(
        total_talents=total_talents,
        total_personas=total_personas,
        active_incidents=active_incidents,
        pending_tasks=pending_tasks,
        total_revenue_mtd=total_revenue_mtd,
        onboarding_in_progress=onboarding_in_progress,
        high_risk_personas=high_risk_personas
    )

@api_router.get("/dashboard/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = []
    
    # High severity incidents
    high_incidents = await db.incidents.find(
        {"status": "open", "severity": {"$in": ["high", "critical"]}},
        {"_id": 0}
    ).to_list(10)
    
    for incident in high_incidents:
        alerts.append({
            "type": "incident",
            "severity": incident["severity"],
            "message": f"Open {incident['incident_type']}: {incident['description'][:50]}...",
            "link": f"/incidents/{incident['id']}"
        })
    
    # High risk personas
    high_risk = await db.personas.find(
        {"risk_rating": {"$gte": 80}},
        {"_id": 0, "id": 1, "persona_name": 1, "risk_rating": 1}
    ).to_list(10)
    
    for persona in high_risk:
        alerts.append({
            "type": "risk",
            "severity": "high",
            "message": f"High risk persona: {persona['persona_name']} (Score: {persona['risk_rating']})",
            "link": f"/personas/{persona['id']}"
        })
    
    # Overdue tasks
    now = datetime.now(timezone.utc).isoformat()
    overdue = await db.tasks.find(
        {"status": "pending", "deadline": {"$lt": now, "$ne": None}},
        {"_id": 0, "id": 1, "title": 1}
    ).to_list(10)
    
    for task in overdue:
        alerts.append({
            "type": "task",
            "severity": "medium",
            "message": f"Overdue task: {task['title']}",
            "link": f"/tasks/{task['id']}"
        })
    
    return alerts

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "fleshsesh TalentOS API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
