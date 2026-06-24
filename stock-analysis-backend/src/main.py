from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.database import init_db
from src.api.auth import router as auth_router

app = FastAPI(
    title="FundamentalsAI API",
    description="AI-driven stock fundamental analysis platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Versioned API routes ──────────────────────────────────
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])

# ── Unversioned alias (前端 useLogin.ts 调用 /api/auth/login) ──
app.include_router(auth_router, prefix="/api/auth", tags=["Auth (legacy)"])

# ── Core API routes ──────────────────────────────────────
from src.api.users import router as users_router
from src.api.stocks import router as stocks_router
from src.api.financials import router as financials_router
from src.api.ai_analysis import router as ai_router
from src.api.watchlists import router as watchlists_router

app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(stocks_router, prefix="/api/v1/stocks", tags=["Stocks"])
app.include_router(financials_router, prefix="/api/v1/financials", tags=["Financials"])
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Analysis"])
app.include_router(watchlists_router, prefix="/api/v1/watchlists", tags=["Watchlists"])


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "FundamentalsAI"}
