from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import secrets
from database import get_db
from models import User, LoginRequest, RegisterRequest, AuthResponse, SwitchRoleRequest

router = APIRouter(prefix="/api/auth", tags=["Auth & RBAC"])

FACULTY_SECRET_CODE = "FACULTY2026"
CURRENT_ACTIVE_ROLE = "student"

@router.get("/users")
def list_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role, department, semester_or_title, initials FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    email = payload.email.strip().lower()
    password = payload.password.strip()
    
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
    user_row = cursor.fetchone()
    
    if not user_row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    user_dict = dict(user_row)
    
    # Check password (fallback to password123 if null/empty in old records)
    db_password = user_dict.get("password") or "password123"
    if password != db_password:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # Check role alignment if specified
    requested_role = payload.role.lower() if payload.role else None
    user_role = user_dict["role"].lower()
    
    # Map 'faculty' to 'teacher' internally
    if requested_role == "faculty":
        requested_role = "teacher"
        
    if requested_role and requested_role != user_role:
        conn.close()
        role_label = "Faculty" if user_role == "teacher" else "Student"
        raise HTTPException(status_code=403, detail=f"Account is registered as {role_label}, not {payload.role.capitalize()}. Please select the correct portal role.")
        
    # Generate token
    new_token = f"token_{user_dict['id']}_{secrets.token_hex(8)}"
    cursor.execute("UPDATE users SET token = ? WHERE id = ?", (new_token, user_dict["id"]))
    conn.commit()
    conn.close()
    
    user_dict["token"] = new_token
    # Hide password in response
    user_dict.pop("password", None)
    
    global CURRENT_ACTIVE_ROLE
    CURRENT_ACTIVE_ROLE = user_dict["role"]
    
    return {
        "token": new_token,
        "user": user_dict,
        "message": f"Successfully authenticated as {user_dict['name']}"
    }

@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    email = payload.email.strip().lower()
    name = payload.name.strip()
    password = payload.password.strip()
    role = payload.role.strip().lower()
    if role == "faculty":
        role = "teacher"
        
    if role not in ["student", "teacher"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'student' or 'faculty'.")
        
    # Secure role check for faculty
    if role == "teacher":
        code = (payload.faculty_access_code or "").strip()
        if code != FACULTY_SECRET_CODE:
            conn.close()
            raise HTTPException(status_code=403, detail="Invalid Faculty Authorization Access Code. Faculty self-registration requires administrative verification.")
            
    # Check email duplicate
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    # Generate initials and ID
    parts = name.split()
    initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "U"
    user_id = f"{'prof' if role == 'teacher' else 'stu'}_{name.lower().replace(' ', '_')[:12]}"
    
    department = payload.department or ("CSE & AI" if role == "teacher" else "CSE")
    semester_or_title = payload.semester_or_title or ("Assistant Professor" if role == "teacher" else "Sem 5")
    token = f"token_{user_id}_{secrets.token_hex(8)}"
    
    cursor.execute("""
    INSERT INTO users (id, name, email, password, role, department, semester_or_title, initials, token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, name, email, password, role, department, semester_or_title, initials, token))
    
    conn.commit()
    
    cursor.execute("SELECT id, name, email, role, department, semester_or_title, initials, token FROM users WHERE id = ?", (user_id,))
    created_user = dict(cursor.fetchone())
    conn.close()
    
    global CURRENT_ACTIVE_ROLE
    CURRENT_ACTIVE_ROLE = role
    
    return {
        "token": token,
        "user": created_user,
        "message": f"Account created successfully for {name} ({role.capitalize()})"
    }

@router.get("/me", response_model=User)
def get_current_user(
    authorization: Optional[str] = Header(None),
    x_session_token: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None)
):
    token = x_session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        
    conn = get_db()
    cursor = conn.cursor()
    
    if token:
        cursor.execute("SELECT id, name, email, role, department, semester_or_title, initials, token FROM users WHERE token = ?", (token,))
        row = cursor.fetchone()
        if row:
            conn.close()
            return dict(row)
            
    # Fallback by role if no token provided
    role = x_user_role or CURRENT_ACTIVE_ROLE
    cursor.execute("SELECT id, name, email, role, department, semester_or_title, initials, token FROM users WHERE LOWER(role) = ?", (role.lower(),))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None), x_session_token: Optional[str] = Header(None)):
    token = x_session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        
    if token:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET token = NULL WHERE token = ?", (token,))
        conn.commit()
        conn.close()
        
    return {"message": "Logged out successfully"}

@router.post("/switch-role")
def switch_role(req: SwitchRoleRequest):
    global CURRENT_ACTIVE_ROLE
    if req.role not in ["student", "teacher"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'student' or 'teacher'.")
    CURRENT_ACTIVE_ROLE = req.role
    return {"message": f"Active role switched to {req.role}", "role": req.role}
