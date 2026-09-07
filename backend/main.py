from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import auth, issues, attendance

app = FastAPI(
    title="CampusResolve API",
    description="Live FastAPI Backend with Role-Based Access Control and Geofenced Attendance",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database Schema & Seed Data
@app.on_event("startup")
def on_startup():
    init_db()

# Mount Routers
app.include_router(auth.router)
app.include_router(issues.router)
app.include_router(attendance.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CampusResolve Backend",
        "features": ["RBAC (Teacher/Student)", "Live Issues Tracking", "Geofenced Attendance System"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
