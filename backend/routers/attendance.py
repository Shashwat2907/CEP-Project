from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models import (
    AttendanceSession, AttendanceSessionCreate, 
    AttendanceMarkRequest, AttendanceRecord
)
from utils.geo import haversine_distance, CAMPUS_PRESETS, STUDENT_LOCATION_PRESETS

router = APIRouter(prefix="/api/attendance", tags=["Geofenced Attendance"])

@router.get("/presets")
def get_presets():
    return {
        "campus_presets": CAMPUS_PRESETS,
        "student_presets": STUDENT_LOCATION_PRESETS
    }

@router.get("/session/active", response_model=Optional[AttendanceSession])
def get_active_session():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM attendance_sessions 
    WHERE is_active = 1 
    ORDER BY id DESC LIMIT 1
    """)
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    session_data = dict(row)
    session_id = session_data["id"]
    
    # Calculate statistics based on distinct students
    cursor.execute("SELECT COUNT(DISTINCT student_id) FROM attendance_records WHERE session_id = ?", (session_id,))
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT student_id) FROM attendance_records WHERE session_id = ? AND status = 'PRESENT'", (session_id,))
    present = cursor.fetchone()[0]
    
    cursor.execute("""
    SELECT COUNT(DISTINCT student_id) FROM attendance_records 
    WHERE session_id = ? AND status = 'OUTSIDE_GEOFENCE'
    AND student_id NOT IN (
        SELECT student_id FROM attendance_records WHERE session_id = ? AND status = 'PRESENT'
    )
    """, (session_id, session_id))
    outside = cursor.fetchone()[0]
    
    conn.close()
    
    session_data["total_marked"] = total
    session_data["present_count"] = present
    session_data["outside_count"] = outside
    session_data["is_active"] = bool(session_data["is_active"])
    
    return session_data

@router.post("/session", response_model=AttendanceSession)
def create_or_update_session(payload: AttendanceSessionCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    # Deactivate any previous active sessions
    cursor.execute("UPDATE attendance_sessions SET is_active = 0 WHERE is_active = 1")
    
    now = datetime.now()
    expires = now + timedelta(minutes=payload.duration_minutes)
    
    cursor.execute("""
    INSERT INTO attendance_sessions (
        course_name, room, teacher_name, latitude, longitude, radius_meters, 
        duration_minutes, created_at, expires_at, is_active
    ) VALUES (?, ?, 'Prof. Rajesh Verma', ?, ?, ?, ?, ?, ?, 1)
    """, (
        payload.course_name,
        payload.room,
        payload.latitude,
        payload.longitude,
        payload.radius_meters,
        payload.duration_minutes,
        now.strftime("%Y-%m-%d %H:%M:%S"),
        expires.strftime("%Y-%m-%d %H:%M:%S")
    ))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM attendance_sessions WHERE id = ?", (new_id,))
    created = dict(cursor.fetchone())
    conn.close()
    
    created["total_marked"] = 0
    created["present_count"] = 0
    created["outside_count"] = 0
    created["is_active"] = True
    
    return created

@router.post("/session/{session_id}/close")
def close_session(session_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE attendance_sessions SET is_active = 0 WHERE id = ?", (session_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    conn.commit()
    conn.close()
    return {"message": f"Attendance session #{session_id} closed successfully"}

@router.post("/mark", response_model=AttendanceRecord)
def mark_attendance(payload: AttendanceMarkRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM attendance_sessions WHERE id = ?", (payload.session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Active attendance session not found")
    
    if not session["is_active"]:
        conn.close()
        raise HTTPException(status_code=400, detail="This attendance session has already concluded.")
    
    # Calculate Haversine Distance
    fence_lat = session["latitude"]
    fence_lon = session["longitude"]
    radius = session["radius_meters"]
    
    distance = haversine_distance(payload.latitude, payload.longitude, fence_lat, fence_lon)
    
    # Determine Geofence Status
    status = "PRESENT" if distance <= radius else "OUTSIDE_GEOFENCE"
    
    timestamp = datetime.now().strftime("%H:%M:%S")
    student_id = payload.student_id or "stu_aditi"
    student_name = payload.student_name or "Aditi Sharma"
    student_dept = payload.student_dept or "CSE Sem 5"
    
    cursor.execute("""
    INSERT INTO attendance_records (
        session_id, student_id, student_name, student_dept, latitude, longitude, 
        distance_meters, radius_meters, status, timestamp, accuracy_meters
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        payload.session_id,
        student_id,
        student_name,
        student_dept,
        payload.latitude,
        payload.longitude,
        distance,
        radius,
        status,
        timestamp,
        payload.accuracy_meters
    ))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM attendance_records WHERE id = ?", (new_id,))
    record = dict(cursor.fetchone())
    conn.close()
    
    return record

@router.get("/records", response_model=List[AttendanceRecord])
def get_attendance_records(session_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if session_id:
        cursor.execute("""
        SELECT * FROM attendance_records 
        WHERE session_id = ? 
        ORDER BY id DESC
        """, (session_id,))
    else:
        cursor.execute("SELECT * FROM attendance_records ORDER BY id DESC LIMIT 50")
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
