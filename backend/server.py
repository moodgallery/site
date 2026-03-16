from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'personal_os_secret')
JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: User

# Finance Models
class TransactionCreate(BaseModel):
    type: str  # income/expense
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[str] = None

class Transaction(BaseModel):
    id: str
    user_id: str
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    created_at: str

class FinancialGoalCreate(BaseModel):
    target_amount: float
    title: str
    month: str  # YYYY-MM format

class FinancialGoal(BaseModel):
    id: str
    user_id: str
    target_amount: float
    title: str
    month: str
    current_amount: float = 0.0
    created_at: str

# Goal Models
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str  # finance, career, health, learning, creativity
    metric: Optional[str] = None
    target_value: Optional[float] = None
    deadline: Optional[str] = None

class Milestone(BaseModel):
    id: str
    title: str
    completed: bool = False

class Goal(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    category: str
    metric: Optional[str] = None
    target_value: Optional[float] = None
    current_value: float = 0.0
    deadline: Optional[str] = None
    milestones: List[Milestone] = []
    completed: bool = False
    created_at: str

# Habit Models
class HabitCreate(BaseModel):
    name: str
    color: str = "#8b5cf6"
    target_days: int = 7  # days per week

class Habit(BaseModel):
    id: str
    user_id: str
    name: str
    color: str
    target_days: int
    streak: int = 0
    created_at: str

class HabitLog(BaseModel):
    id: str
    habit_id: str
    user_id: str
    date: str
    completed: bool

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    category: str
    deadline: Optional[str] = None

class Task(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    priority: str
    category: str
    deadline: Optional[str] = None
    completed: bool = False
    order: int = 0
    created_at: str

# Schedule Models
class ScheduleBlockCreate(BaseModel):
    title: str
    start_time: str
    end_time: str
    date: str
    task_id: Optional[str] = None
    color: str = "#3b82f6"

class ScheduleBlock(BaseModel):
    id: str
    user_id: str
    title: str
    start_time: str
    end_time: str
    date: str
    task_id: Optional[str] = None
    color: str
    created_at: str

# Weekly Review Models
class WeeklyReflection(BaseModel):
    what_worked: Optional[str] = None
    what_earned: Optional[str] = None
    what_to_remove: Optional[str] = None

class WeeklyReview(BaseModel):
    id: str
    user_id: str
    week_start: str
    week_end: str
    tasks_completed: int
    habits_completion_rate: float
    total_income: float
    total_expense: float
    reflection: Optional[WeeklyReflection] = None
    created_at: str

# Settings & Categories Models
class UserSettings(BaseModel):
    user_id: str
    currency: str = "USD"
    currency_symbol: str = "$"

class UserSettingsUpdate(BaseModel):
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    type: str  # income, expense, task, goal
    color: str = "#6b7280"

class Category(BaseModel):
    id: str
    user_id: str
    name: str
    type: str
    color: str
    is_default: bool = False
    created_at: str

# AI Assistant Models
class AIAnalysisRequest(BaseModel):
    analysis_type: str  # productivity, schedule, habits, weekly_report

class AIAnalysisResponse(BaseModel):
    analysis: str
    suggestions: List[str] = []

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> User:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # First try JWT token
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id:
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user_doc:
                if isinstance(user_doc.get('created_at'), str):
                    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
                return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        pass
    
    # Then try session token (Google OAuth)
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pwd = hash_password(data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hashed_pwd,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    
    user = User(
        user_id=user_id,
        email=data.email,
        name=data.name,
        picture=None,
        created_at=datetime.now(timezone.utc)
    )
    
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user_doc["user_id"])
    
    created_at = user_doc.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    user = User(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture"),
        created_at=created_at
    )
    
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        google_data = resp.json()
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": google_data["email"]}, {"_id": 0})
    
    if user_doc:
        user_id = user_doc["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": google_data["name"], "picture": google_data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": google_data["email"],
            "name": google_data["name"],
            "picture": google_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = google_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_id,
        "email": google_data["email"],
        "name": google_data["name"],
        "picture": google_data.get("picture")
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== FINANCE ROUTES ====================

@api_router.post("/finance/transactions", response_model=Transaction)
async def create_transaction(data: TransactionCreate, user: User = Depends(get_current_user)):
    trans_id = f"trans_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": trans_id,
        "user_id": user.user_id,
        "type": data.type,
        "amount": data.amount,
        "category": data.category,
        "description": data.description,
        "date": data.date or now[:10],
        "created_at": now
    }
    
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)
    return Transaction(**doc)

@api_router.get("/finance/transactions", response_model=List[Transaction])
async def get_transactions(user: User = Depends(get_current_user), month: Optional[str] = None):
    query = {"user_id": user.user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    docs = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return [Transaction(**d) for d in docs]

@api_router.delete("/finance/transactions/{trans_id}")
async def delete_transaction(trans_id: str, user: User = Depends(get_current_user)):
    result = await db.transactions.delete_one({"id": trans_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Deleted"}

@api_router.get("/finance/summary")
async def get_finance_summary(user: User = Depends(get_current_user), month: Optional[str] = None):
    query = {"user_id": user.user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    docs = await db.transactions.find(query, {"_id": 0}).to_list(500)
    
    total_income = sum(d["amount"] for d in docs if d["type"] == "income")
    total_expense = sum(d["amount"] for d in docs if d["type"] == "expense")
    
    income_by_category = {}
    expense_by_category = {}
    
    for d in docs:
        cat = d["category"]
        if d["type"] == "income":
            income_by_category[cat] = income_by_category.get(cat, 0) + d["amount"]
        else:
            expense_by_category[cat] = expense_by_category.get(cat, 0) + d["amount"]
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "income_by_category": income_by_category,
        "expense_by_category": expense_by_category
    }

@api_router.post("/finance/goals", response_model=FinancialGoal)
async def create_financial_goal(data: FinancialGoalCreate, user: User = Depends(get_current_user)):
    goal_id = f"fgoal_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": goal_id,
        "user_id": user.user_id,
        "target_amount": data.target_amount,
        "title": data.title,
        "month": data.month,
        "current_amount": 0.0,
        "created_at": now
    }
    
    await db.financial_goals.insert_one(doc)
    return FinancialGoal(**doc)

@api_router.get("/finance/goals", response_model=List[FinancialGoal])
async def get_financial_goals(user: User = Depends(get_current_user)):
    docs = await db.financial_goals.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    # Update current_amount based on transactions
    for doc in docs:
        trans = await db.transactions.find({
            "user_id": user.user_id,
            "type": "income",
            "date": {"$regex": f"^{doc['month']}"}
        }, {"_id": 0}).to_list(500)
        doc["current_amount"] = sum(t["amount"] for t in trans)
    
    return [FinancialGoal(**d) for d in docs]

# ==================== GOALS ROUTES ====================

@api_router.post("/goals", response_model=Goal)
async def create_goal(data: GoalCreate, user: User = Depends(get_current_user)):
    goal_id = f"goal_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": goal_id,
        "user_id": user.user_id,
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "metric": data.metric,
        "target_value": data.target_value,
        "current_value": 0.0,
        "deadline": data.deadline,
        "milestones": [],
        "completed": False,
        "created_at": now
    }
    
    await db.goals.insert_one(doc)
    return Goal(**doc)

@api_router.get("/goals", response_model=List[Goal])
async def get_goals(user: User = Depends(get_current_user), category: Optional[str] = None):
    query = {"user_id": user.user_id}
    if category:
        query["category"] = category
    
    docs = await db.goals.find(query, {"_id": 0}).to_list(100)
    return [Goal(**d) for d in docs]

@api_router.put("/goals/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, data: dict, user: User = Depends(get_current_user)):
    result = await db.goals.find_one_and_update(
        {"id": goal_id, "user_id": user.user_id},
        {"$set": data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    del result["_id"]
    return Goal(**result)

@api_router.post("/goals/{goal_id}/milestones")
async def add_milestone(goal_id: str, data: dict, user: User = Depends(get_current_user)):
    milestone_id = f"ms_{uuid.uuid4().hex[:8]}"
    milestone = {"id": milestone_id, "title": data.get("title", ""), "completed": False}
    
    result = await db.goals.update_one(
        {"id": goal_id, "user_id": user.user_id},
        {"$push": {"milestones": milestone}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return milestone

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    result = await db.goals.delete_one({"id": goal_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Deleted"}

# ==================== HABITS ROUTES ====================

@api_router.post("/habits", response_model=Habit)
async def create_habit(data: HabitCreate, user: User = Depends(get_current_user)):
    habit_id = f"habit_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": habit_id,
        "user_id": user.user_id,
        "name": data.name,
        "color": data.color,
        "target_days": data.target_days,
        "streak": 0,
        "created_at": now
    }
    
    await db.habits.insert_one(doc)
    return Habit(**doc)

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(user: User = Depends(get_current_user)):
    docs = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return [Habit(**d) for d in docs]

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user: User = Depends(get_current_user)):
    result = await db.habits.delete_one({"id": habit_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Also delete logs
    await db.habit_logs.delete_many({"habit_id": habit_id, "user_id": user.user_id})
    return {"message": "Deleted"}

@api_router.post("/habits/{habit_id}/log")
async def log_habit(habit_id: str, data: dict, user: User = Depends(get_current_user)):
    date = data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    completed = data.get("completed", True)
    
    # Check if log exists
    existing = await db.habit_logs.find_one({
        "habit_id": habit_id,
        "user_id": user.user_id,
        "date": date
    }, {"_id": 0})
    
    if existing:
        await db.habit_logs.update_one(
            {"id": existing["id"]},
            {"$set": {"completed": completed}}
        )
        existing["completed"] = completed
        return existing
    
    log_id = f"hlog_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": log_id,
        "habit_id": habit_id,
        "user_id": user.user_id,
        "date": date,
        "completed": completed
    }
    
    await db.habit_logs.insert_one(doc)
    doc.pop("_id", None)
    
    # Update streak
    if completed:
        await update_habit_streak(habit_id, user.user_id)
    
    return doc

async def update_habit_streak(habit_id: str, user_id: str):
    logs = await db.habit_logs.find({
        "habit_id": habit_id,
        "user_id": user_id,
        "completed": True
    }, {"_id": 0}).sort("date", -1).to_list(100)
    
    if not logs:
        return
    
    streak = 0
    today = datetime.now(timezone.utc).date()
    
    for i, log in enumerate(logs):
        log_date = datetime.strptime(log["date"], "%Y-%m-%d").date()
        expected_date = today - timedelta(days=i)
        
        if log_date == expected_date:
            streak += 1
        else:
            break
    
    await db.habits.update_one({"id": habit_id}, {"$set": {"streak": streak}})

@api_router.get("/habits/{habit_id}/logs")
async def get_habit_logs(habit_id: str, user: User = Depends(get_current_user), month: Optional[str] = None):
    query = {"habit_id": habit_id, "user_id": user.user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    docs = await db.habit_logs.find(query, {"_id": 0}).to_list(100)
    return docs

@api_router.get("/habits/today")
async def get_today_habits(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    logs = await db.habit_logs.find({
        "user_id": user.user_id,
        "date": today
    }, {"_id": 0}).to_list(100)
    
    log_map = {l["habit_id"]: l["completed"] for l in logs}
    
    result = []
    for h in habits:
        result.append({
            **h,
            "completed_today": log_map.get(h["id"], False)
        })
    
    return result

# ==================== TASKS ROUTES ====================

@api_router.post("/tasks", response_model=Task)
async def create_task(data: TaskCreate, user: User = Depends(get_current_user)):
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Get max order
    max_order = await db.tasks.find_one(
        {"user_id": user.user_id},
        sort=[("order", -1)]
    )
    order = (max_order["order"] + 1) if max_order else 0
    
    doc = {
        "id": task_id,
        "user_id": user.user_id,
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
        "category": data.category,
        "deadline": data.deadline,
        "completed": False,
        "order": order,
        "created_at": now
    }
    
    await db.tasks.insert_one(doc)
    return Task(**doc)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(
    user: User = Depends(get_current_user),
    category: Optional[str] = None,
    completed: Optional[bool] = None
):
    query = {"user_id": user.user_id}
    if category:
        query["category"] = category
    if completed is not None:
        query["completed"] = completed
    
    docs = await db.tasks.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return [Task(**d) for d in docs]

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, data: dict, user: User = Depends(get_current_user)):
    result = await db.tasks.find_one_and_update(
        {"id": task_id, "user_id": user.user_id},
        {"$set": data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    
    del result["_id"]
    return Task(**result)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: User = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Deleted"}

@api_router.post("/tasks/reorder")
async def reorder_tasks(data: dict, user: User = Depends(get_current_user)):
    task_ids = data.get("task_ids", [])
    
    for i, task_id in enumerate(task_ids):
        await db.tasks.update_one(
            {"id": task_id, "user_id": user.user_id},
            {"$set": {"order": i}}
        )
    
    return {"message": "Reordered"}

@api_router.get("/tasks/today")
async def get_today_tasks(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    docs = await db.tasks.find({
        "user_id": user.user_id,
        "$or": [
            {"deadline": today},
            {"deadline": None, "completed": False}
        ]
    }, {"_id": 0}).sort([("priority", -1), ("order", 1)]).to_list(50)
    
    return [Task(**d) for d in docs]

# ==================== SCHEDULE ROUTES ====================

@api_router.post("/schedule", response_model=ScheduleBlock)
async def create_schedule_block(data: ScheduleBlockCreate, user: User = Depends(get_current_user)):
    block_id = f"block_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": block_id,
        "user_id": user.user_id,
        "title": data.title,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "date": data.date,
        "task_id": data.task_id,
        "color": data.color,
        "created_at": now
    }
    
    await db.schedule_blocks.insert_one(doc)
    return ScheduleBlock(**doc)

@api_router.get("/schedule", response_model=List[ScheduleBlock])
async def get_schedule(user: User = Depends(get_current_user), date: Optional[str] = None):
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    
    docs = await db.schedule_blocks.find(query, {"_id": 0}).sort("start_time", 1).to_list(100)
    return [ScheduleBlock(**d) for d in docs]

@api_router.put("/schedule/{block_id}", response_model=ScheduleBlock)
async def update_schedule_block(block_id: str, data: dict, user: User = Depends(get_current_user)):
    result = await db.schedule_blocks.find_one_and_update(
        {"id": block_id, "user_id": user.user_id},
        {"$set": data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Block not found")
    
    del result["_id"]
    return ScheduleBlock(**result)

@api_router.delete("/schedule/{block_id}")
async def delete_schedule_block(block_id: str, user: User = Depends(get_current_user)):
    result = await db.schedule_blocks.delete_one({"id": block_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"message": "Deleted"}

# ==================== WEEKLY REVIEW ROUTES ====================

@api_router.get("/weekly-review")
async def get_weekly_review(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    week_start_str = week_start.strftime("%Y-%m-%d")
    week_end_str = week_end.strftime("%Y-%m-%d")
    
    # Tasks completed this week
    tasks = await db.tasks.find({
        "user_id": user.user_id,
        "completed": True
    }, {"_id": 0}).to_list(500)
    
    tasks_completed = len([t for t in tasks if t.get("created_at", "")[:10] >= week_start_str])
    
    # Habits completion
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    habit_logs = await db.habit_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": week_start_str, "$lte": week_end_str},
        "completed": True
    }, {"_id": 0}).to_list(500)
    
    total_possible = len(habits) * 7
    habits_completion_rate = (len(habit_logs) / total_possible * 100) if total_possible > 0 else 0
    
    # Finance
    transactions = await db.transactions.find({
        "user_id": user.user_id,
        "date": {"$gte": week_start_str, "$lte": week_end_str}
    }, {"_id": 0}).to_list(500)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    
    # Get existing review or create new
    review_doc = await db.weekly_reviews.find_one({
        "user_id": user.user_id,
        "week_start": week_start_str
    }, {"_id": 0})
    
    result = {
        "week_start": week_start_str,
        "week_end": week_end_str,
        "tasks_completed": tasks_completed,
        "habits_completion_rate": round(habits_completion_rate, 1),
        "total_income": total_income,
        "total_expense": total_expense,
        "reflection": review_doc.get("reflection") if review_doc else None
    }
    
    return result

@api_router.post("/weekly-review/reflection")
async def save_weekly_reflection(data: WeeklyReflection, user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    week_start_str = week_start.strftime("%Y-%m-%d")
    week_end_str = (week_start + timedelta(days=6)).strftime("%Y-%m-%d")
    
    await db.weekly_reviews.update_one(
        {"user_id": user.user_id, "week_start": week_start_str},
        {"$set": {
            "user_id": user.user_id,
            "week_start": week_start_str,
            "week_end": week_end_str,
            "reflection": data.model_dump(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Saved"}

# ==================== AI ASSISTANT ROUTES ====================

@api_router.post("/ai/analyze", response_model=AIAnalysisResponse)
async def ai_analyze(data: AIAnalysisRequest, user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Gather user data for context
    tasks = await db.tasks.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    week_start_str = week_start.strftime("%Y-%m-%d")
    
    habit_logs = await db.habit_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": week_start_str},
        "completed": True
    }, {"_id": 0}).to_list(500)
    
    transactions = await db.transactions.find({
        "user_id": user.user_id
    }, {"_id": 0}).sort("date", -1).to_list(100)
    
    # Build context
    context = f"""
Дані користувача:
- Завдань всього: {len(tasks)}, виконано: {len([t for t in tasks if t.get('completed')])}
- Звичок: {len(habits)}
- Логів звичок за тиждень: {len(habit_logs)}
- Транзакцій: {len(transactions)}
- Загальний дохід: ${sum(t['amount'] for t in transactions if t['type'] == 'income')}
- Загальні витрати: ${sum(t['amount'] for t in transactions if t['type'] == 'expense')}

Звички: {', '.join(h['name'] for h in habits)}
Категорії завдань: {', '.join(set(t['category'] for t in tasks))}
"""
    
    prompts = {
        "productivity": f"Проаналізуй продуктивність користувача та дай рекомендації для покращення. Відповідай українською.\n{context}",
        "schedule": f"Проаналізуй як користувач розподіляє час і запропонуй оптимізацію розкладу. Відповідай українською.\n{context}",
        "habits": f"Проаналізуй звички користувача та покажи, як вони можуть впливати на дохід. Відповідай українською.\n{context}",
        "weekly_report": f"Створи щотижневий звіт ефективності з ключовими інсайтами. Відповідай українською.\n{context}"
    }
    
    prompt = prompts.get(data.analysis_type, prompts["productivity"])
    
    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"ai_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="Ти AI-асистент для продуктивності. Допомагаєш аналізувати дані користувача та даєш корисні поради. Відповідай українською мовою, коротко і по суті."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse response for suggestions
        lines = response.split('\n')
        suggestions = [l.strip('- •').strip() for l in lines if l.strip().startswith(('-', '•', '*'))][:5]
        
        return AIAnalysisResponse(
            analysis=response,
            suggestions=suggestions if suggestions else ["Продовжуйте працювати над своїми цілями!"]
        )
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return AIAnalysisResponse(
            analysis="Не вдалося виконати аналіз. Спробуйте пізніше.",
            suggestions=["Перевірте підключення до інтернету"]
        )

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard")
async def get_dashboard(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_month = today[:7]
    
    # Today's tasks
    today_tasks = await db.tasks.find({
        "user_id": user.user_id,
        "completed": False
    }, {"_id": 0}).sort([("priority", -1), ("order", 1)]).to_list(10)
    
    # Today's habits
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    habit_logs = await db.habit_logs.find({
        "user_id": user.user_id,
        "date": today
    }, {"_id": 0}).to_list(100)
    
    log_map = {l["habit_id"]: l["completed"] for l in habit_logs}
    habits_today = [{**h, "completed_today": log_map.get(h["id"], False)} for h in habits]
    
    # Finance summary
    transactions = await db.transactions.find({
        "user_id": user.user_id,
        "date": {"$regex": f"^{current_month}"}
    }, {"_id": 0}).to_list(500)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    
    # Financial goal progress
    fin_goals = await db.financial_goals.find({
        "user_id": user.user_id,
        "month": current_month
    }, {"_id": 0}).to_list(10)
    
    # Goals progress
    goals = await db.goals.find({
        "user_id": user.user_id,
        "completed": False
    }, {"_id": 0}).to_list(10)
    
    # Weekly productivity
    week_start = (datetime.now(timezone.utc).date() - timedelta(days=datetime.now(timezone.utc).date().weekday())).strftime("%Y-%m-%d")
    
    week_tasks = await db.tasks.find({
        "user_id": user.user_id,
        "completed": True
    }, {"_id": 0}).to_list(500)
    
    tasks_this_week = len([t for t in week_tasks if t.get("created_at", "")[:10] >= week_start])
    
    return {
        "today_tasks": today_tasks,
        "habits_today": habits_today,
        "finance": {
            "income": total_income,
            "expense": total_expense,
            "balance": total_income - total_expense,
            "goals": fin_goals
        },
        "goals": goals,
        "weekly_productivity": {
            "tasks_completed": tasks_this_week,
            "habits_completed": len([h for h in habits_today if h["completed_today"]]),
            "total_habits": len(habits)
        }
    }

# ==================== SETTINGS ROUTES ====================

# Default categories that will be created for new users
DEFAULT_CATEGORIES = [
    # Income categories
    {"name": "Продажі мистецтва", "type": "income", "color": "#10b981"},
    {"name": "Консультації", "type": "income", "color": "#3b82f6"},
    {"name": "Зарплата", "type": "income", "color": "#8b5cf6"},
    {"name": "Інвестиції", "type": "income", "color": "#f59e0b"},
    {"name": "Рекламні інтеграції", "type": "income", "color": "#ec4899"},
    {"name": "Інше", "type": "income", "color": "#6b7280"},
    # Expense categories
    {"name": "Оренда", "type": "expense", "color": "#f43f5e"},
    {"name": "Їжа", "type": "expense", "color": "#ef4444"},
    {"name": "Транспорт", "type": "expense", "color": "#f97316"},
    {"name": "Комунальні", "type": "expense", "color": "#eab308"},
    {"name": "Розваги", "type": "expense", "color": "#ec4899"},
    {"name": "Навчання", "type": "expense", "color": "#6366f1"},
    {"name": "Здоров'я", "type": "expense", "color": "#14b8a6"},
    {"name": "Інше", "type": "expense", "color": "#6b7280"},
    # Task categories
    {"name": "Гроші / Продажі", "type": "task", "color": "#10b981"},
    {"name": "Контент", "type": "task", "color": "#8b5cf6"},
    {"name": "Дослідження", "type": "task", "color": "#3b82f6"},
    {"name": "Нетворк", "type": "task", "color": "#f59e0b"},
    {"name": "Операційна робота", "type": "task", "color": "#6b7280"},
    # Goal categories
    {"name": "Фінанси", "type": "goal", "color": "#10b981"},
    {"name": "Кар'єра", "type": "goal", "color": "#3b82f6"},
    {"name": "Здоров'я", "type": "goal", "color": "#f43f5e"},
    {"name": "Навчання", "type": "goal", "color": "#8b5cf6"},
    {"name": "Творчість", "type": "goal", "color": "#f59e0b"},
]

CURRENCIES = [
    {"code": "USD", "symbol": "$", "name": "Долар США"},
    {"code": "EUR", "symbol": "€", "name": "Євро"},
    {"code": "UAH", "symbol": "₴", "name": "Гривня"},
    {"code": "GBP", "symbol": "£", "name": "Фунт"},
    {"code": "PLN", "symbol": "zł", "name": "Злотий"},
]

async def init_user_defaults(user_id: str):
    """Initialize default categories and settings for a new user"""
    # Check if user already has categories
    existing = await db.categories.find_one({"user_id": user_id})
    if existing:
        return
    
    # Create default categories
    now = datetime.now(timezone.utc).isoformat()
    for cat in DEFAULT_CATEGORIES:
        cat_id = f"cat_{uuid.uuid4().hex[:12]}"
        await db.categories.insert_one({
            "id": cat_id,
            "user_id": user_id,
            "name": cat["name"],
            "type": cat["type"],
            "color": cat["color"],
            "is_default": True,
            "created_at": now
        })
    
    # Create default settings
    await db.user_settings.insert_one({
        "user_id": user_id,
        "currency": "USD",
        "currency_symbol": "$",
        "created_at": now
    })

@api_router.get("/settings")
async def get_settings(user: User = Depends(get_current_user)):
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    if not settings:
        await init_user_defaults(user.user_id)
        settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    return settings

@api_router.put("/settings")
async def update_settings(data: UserSettingsUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.user_settings.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    return {"message": "Settings updated"}

@api_router.get("/settings/currencies")
async def get_currencies():
    return CURRENCIES

# ==================== CATEGORIES ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories(user: User = Depends(get_current_user), type: Optional[str] = None):
    # Initialize defaults if needed
    existing = await db.categories.find_one({"user_id": user.user_id})
    if not existing:
        await init_user_defaults(user.user_id)
    
    query = {"user_id": user.user_id}
    if type:
        query["type"] = type
    
    docs = await db.categories.find(query, {"_id": 0}).sort("name", 1).to_list(200)
    return [Category(**d) for d in docs]

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate, user: User = Depends(get_current_user)):
    cat_id = f"cat_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": cat_id,
        "user_id": user.user_id,
        "name": data.name,
        "type": data.type,
        "color": data.color,
        "is_default": False,
        "created_at": now
    }
    
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return Category(**doc)

@api_router.put("/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, data: dict, user: User = Depends(get_current_user)):
    # Only allow updating name and color
    update_data = {}
    if "name" in data:
        update_data["name"] = data["name"]
    if "color" in data:
        update_data["color"] = data["color"]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.categories.find_one_and_update(
        {"id": cat_id, "user_id": user.user_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    result.pop("_id", None)
    return Category(**result)

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: User = Depends(get_current_user)):
    # Check if category is default
    cat = await db.categories.find_one({"id": cat_id, "user_id": user.user_id}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if cat.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default category")
    
    await db.categories.delete_one({"id": cat_id, "user_id": user.user_id})
    return {"message": "Category deleted"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Personal Operating System API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
