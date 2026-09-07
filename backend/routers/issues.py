from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from database import get_db
from models import Issue, IssueCreate

router = APIRouter(prefix="/api/issues", tags=["Issues"])

STAGES = ['CR', 'Class Teacher', 'HOD']

@router.get("", response_model=List[Issue])
def get_issues():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM issues ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=Issue)
def create_issue(payload: IssueCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    is_critical = payload.priority == "Critical"
    stage = 2 if is_critical else 0
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    cursor.execute("""
    INSERT INTO issues (category, priority, title, description, imagePreview, status, stage, daysElapsed, date, reportedBy, upvotes)
    VALUES (?, ?, ?, ?, ?, 'Pending', ?, 0, ?, 'Aditi Sharma', 1)
    """, (payload.category, payload.priority, payload.title, payload.description, payload.imagePreview, stage, today_str))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM issues WHERE id = ?", (new_id,))
    created = cursor.fetchone()
    conn.close()
    
    return dict(created)

@router.post("/{issue_id}/resolve")
def resolve_issue(issue_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE issues SET status = 'Resolved' WHERE id = ?", (issue_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Issue not found")
    conn.commit()
    conn.close()
    return {"message": f"Issue #{issue_id} marked as Resolved"}

@router.post("/{issue_id}/escalate")
def escalate_issue(issue_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT stage, status FROM issues WHERE id = ?", (issue_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Issue not found")
    
    curr_stage = row["stage"]
    next_stage = min(curr_stage + 1, len(STAGES) - 1)
    
    cursor.execute("""
    UPDATE issues 
    SET stage = ?, status = 'InProgress', daysElapsed = 0 
    WHERE id = ?
    """, (next_stage, issue_id))
    conn.commit()
    conn.close()
    return {"message": f"Issue #{issue_id} escalated to {STAGES[next_stage]}", "stage": next_stage}

@router.post("/{issue_id}/upvote")
def upvote_issue(issue_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE issues SET upvotes = upvotes + 1 WHERE id = ?", (issue_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Issue not found")
    conn.commit()
    cursor.execute("SELECT upvotes FROM issues WHERE id = ?", (issue_id,))
    new_count = cursor.fetchone()["upvotes"]
    conn.close()
    return {"upvotes": new_count}
