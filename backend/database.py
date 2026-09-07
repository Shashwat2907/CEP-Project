import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "campusresolve.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        semester_or_title TEXT NOT NULL,
        initials TEXT NOT NULL
    );
    """)

    # Issues table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        imagePreview TEXT,
        status TEXT NOT NULL,
        stage INTEGER NOT NULL,
        daysElapsed INTEGER NOT NULL,
        date TEXT NOT NULL,
        reportedBy TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0
    );
    """)

    # Attendance sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        room TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters REAL NOT NULL,
        duration_minutes INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
    );
    """)

    # Attendance records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_dept TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        distance_meters REAL NOT NULL,
        radius_meters REAL NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        accuracy_meters REAL DEFAULT 5.0,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
    );
    """)

    conn.commit()

    # Seed Users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
        INSERT INTO users (id, name, email, role, department, semester_or_title, initials)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ("stu_aditi", "Aditi Sharma", "aditi.sharma@campus.edu", "student", "CSE", "Sem 5", "AS"),
            ("prof_rajesh", "Prof. Rajesh Verma", "rajesh.verma@campus.edu", "teacher", "CSE & AI", "Associate Professor / HOD", "RV")
        ])
        conn.commit()

    # Seed Issues
    cursor.execute("SELECT COUNT(*) FROM issues")
    if cursor.fetchone()[0] == 0:
        initial_issues = [
            (1042, 'Projector / AV', 'High', 'Projector not turning on in Room 204',
             'Bulb seems dead, tried two different HDMI cables. Blocking the whole first period.',
             None, 'InProgress', 1, 1, '2026-07-24', 'Aditi Sharma', 8),
            (1041, 'Electrical / Fans / Lights', 'Critical', 'Ceiling fan sparking in Lab 3',
             'Fan made a loud crackling noise and sparked briefly during afternoon session.',
             None, 'InProgress', 2, 0, '2026-07-24', 'Rohan Mehta', 14),
            (1039, 'Furniture / Seating', 'Low', 'Broken chair leg, Row 3 Seat 2',
             'One of the chair legs is cracked and wobbles. Minor risk of tipping over.',
             None, 'Pending', 0, 1, '2026-07-23', 'Aditi Sharma', 2),
            (1037, 'Internet / Wi-Fi', 'Medium', 'Wi-Fi drops every 10 minutes in the CS wing',
             'Affects the whole floor during lab hours, makes it hard to submit assignments on time.',
             None, 'InProgress', 1, 2, '2026-07-22', 'Neha Kulkarni', 11),
            (1035, 'Cleanliness', 'Medium', 'Washroom near Block B not cleaned since Monday',
             'No soap, overflowing bin. Reported to housekeeping once already with no response.',
             None, 'Resolved', 0, 3, '2026-07-20', 'Aditi Sharma', 5),
            (1033, 'Safety Hazard', 'Critical', 'Exposed wiring near the stairwell exit',
             'Cables running along the floor near emergency exit, tripping hazard.',
             None, 'Resolved', 2, 1, '2026-07-18', 'Rohan Mehta', 19),
            (1031, 'Furniture / Seating', 'Medium', 'Not enough chairs for elective batch',
             'Six students standing through the entire lecture, batch size grew.',
             None, 'Pending', 0, 0, '2026-07-24', 'Aditi Sharma', 7),
            (1028, 'Projector / AV', 'Low', 'Screen flickering during presentations',
             'Happens intermittently, worse when the AC is running.',
             None, 'Resolved', 0, 2, '2026-07-15', 'Neha Kulkarni', 3)
        ]
        cursor.executemany("""
        INSERT INTO issues (id, category, priority, title, description, imagePreview, status, stage, daysElapsed, date, reportedBy, upvotes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_issues)
        conn.commit()

    # Seed an active Geofence Session
    cursor.execute("SELECT COUNT(*) FROM attendance_sessions")
    if cursor.fetchone()[0] == 0:
        now = datetime.now()
        expires = now + timedelta(hours=2)
        cursor.execute("""
        INSERT INTO attendance_sessions (
            course_name, room, teacher_name, latitude, longitude, radius_meters, 
            duration_minutes, created_at, expires_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            "CSE 302: Computer Networks & Distributed Systems",
            "Academic Block A - Room 204",
            "Prof. Rajesh Verma",
            28.5450,
            77.1926,
            100.0,
            120,
            now.strftime("%Y-%m-%d %H:%M:%S"),
            expires.strftime("%Y-%m-%d %H:%M:%S")
        ))
        session_id = cursor.lastrowid

        # Seed demo records
        sample_records = [
            (session_id, "stu_rohan", "Rohan Mehta", "CSE Sem 5", 28.5451, 77.1928, 24.3, 100.0, "PRESENT", now.strftime("%H:%M:%S"), 4.0),
            (session_id, "stu_neha", "Neha Kulkarni", "CSE Sem 5", 28.5448, 77.1924, 31.8, 100.0, "PRESENT", now.strftime("%H:%M:%S"), 3.5),
            (session_id, "stu_vikram", "Vikram Rathore", "CSE Sem 5", 28.5510, 77.1970, 720.5, 100.0, "OUTSIDE_GEOFENCE", now.strftime("%H:%M:%S"), 8.0)
        ]
        cursor.executemany("""
        INSERT INTO attendance_records (
            session_id, student_id, student_name, student_dept, latitude, longitude, 
            distance_meters, radius_meters, status, timestamp, accuracy_meters
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_records)
        conn.commit()

    conn.close()
