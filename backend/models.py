from typing import Optional, List
from pydantic import BaseModel, Field

# User & Auth
class User(BaseModel):
    id: str
    name: str
    email: str
    role: str  # "student" or "teacher"
    department: str
    semester_or_title: str
    initials: str

class SwitchRoleRequest(BaseModel):
    role: str

# Issues
class IssueCreate(BaseModel):
    category: str
    priority: str
    title: str
    description: str
    imagePreview: Optional[str] = None

class Issue(BaseModel):
    id: int
    category: str
    priority: str
    title: str
    description: str
    imagePreview: Optional[str] = None
    status: str
    stage: int
    daysElapsed: int
    date: str
    reportedBy: str
    upvotes: int = 0

# Geofenced Attendance
class AttendanceSessionCreate(BaseModel):
    course_name: str = Field(..., example="CSE 302 - Computer Networks")
    room: str = Field(..., example="Room 204")
    latitude: float = Field(..., example=28.5450)
    longitude: float = Field(..., example=77.1926)
    radius_meters: float = Field(100.0, example=100.0)
    duration_minutes: int = Field(60, example=60)

class AttendanceSession(BaseModel):
    id: int
    course_name: str
    room: str
    teacher_name: str
    latitude: float
    longitude: float
    radius_meters: float
    duration_minutes: int
    created_at: str
    expires_at: str
    is_active: bool
    total_marked: int = 0
    present_count: int = 0
    outside_count: int = 0

class AttendanceMarkRequest(BaseModel):
    session_id: int
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = 5.0
    preset_name: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_dept: Optional[str] = None

class AttendanceRecord(BaseModel):
    id: int
    session_id: int
    student_id: str
    student_name: str
    student_dept: str
    latitude: float
    longitude: float
    distance_meters: float
    radius_meters: float
    status: str  # "PRESENT" or "OUTSIDE_GEOFENCE"
    timestamp: str
    accuracy_meters: Optional[float] = 5.0
