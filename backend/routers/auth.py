from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from database import get_db
from models import User, SwitchRoleRequest

router = APIRouter(prefix="/api/auth", tags=["Auth & RBAC"])

# In-memory active user pointer (defaults to student)
CURRENT_ACTIVE_ROLE = "student"

@router.get("/users")
def list_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.get("/me")
def get_current_user(x_user_role: Optional[str] = Header(None)):
    role = x_user_role or CURRENT_ACTIVE_ROLE
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE role = ?", (role.lower(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)

@router.post("/switch-role")
def switch_role(req: SwitchRoleRequest):
    global CURRENT_ACTIVE_ROLE
    if req.role not in ["student", "teacher"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'student' or 'teacher'.")
    CURRENT_ACTIVE_ROLE = req.role
    return {"message": f"Active role switched to {req.role}", "role": req.role}
