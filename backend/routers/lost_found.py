from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import LostFoundItem, LostFoundItemCreate, ClaimItemRequest, StatusUpdateRequest

router = APIRouter(prefix="/api/lost-found", tags=["Lost & Found"])

@router.get("", response_model=List[LostFoundItem])
def get_lost_found_items():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lost_found_items ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=LostFoundItem)
def create_lost_found_item(
    payload: LostFoundItemCreate,
    x_user_name: Optional[str] = Header("Rahul Verma"),
    x_user_id: Optional[str] = Header("stu_rahul")
):
    conn = get_db()
    cursor = conn.cursor()
    
    today_str = payload.date if payload.date else datetime.now().strftime("%Y-%m-%d")
    created_at_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    item_type = payload.type.upper() if payload.type else "LOST"
    
    cursor.execute("""
    INSERT INTO lost_found_items (
        type, title, description, category, location, date, contact, imageUrl, status,
        reportedBy, reportedById, createdAt, claimedBy, claimNotes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, None, None)
    """, (
        item_type,
        payload.title,
        payload.description,
        payload.category,
        payload.location,
        today_str,
        payload.contact,
        payload.imageUrl,
        x_user_name or "Rahul Verma",
        x_user_id or "stu_rahul",
        created_at_str
    ))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM lost_found_items WHERE id = ?", (new_id,))
    created = cursor.fetchone()
    conn.close()
    
    return dict(created)

@router.post("/{item_id}/claim")
def claim_lost_found_item(
    item_id: int,
    payload: ClaimItemRequest,
    x_user_name: Optional[str] = Header("Rahul Verma")
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lost_found_items WHERE id = ?", (item_id,))
    item = cursor.fetchone()
    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")
        
    claimed_by = x_user_name or "Rahul Verma"
    notes = payload.claimNotes or "Claim submitted by user"
    
    cursor.execute("""
    UPDATE lost_found_items
    SET status = 'Claimed', claimedBy = ?, claimNotes = ?
    WHERE id = ?
    """, (claimed_by, notes, item_id))
    conn.commit()
    
    cursor.execute("SELECT * FROM lost_found_items WHERE id = ?", (item_id,))
    updated = cursor.fetchone()
    conn.close()
    
    return dict(updated)

@router.post("/{item_id}/status")
def update_item_status(item_id: int, payload: StatusUpdateRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lost_found_items WHERE id = ?", (item_id,))
    item = cursor.fetchone()
    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")
        
    cursor.execute("UPDATE lost_found_items SET status = ? WHERE id = ?", (payload.status, item_id))
    conn.commit()
    
    cursor.execute("SELECT * FROM lost_found_items WHERE id = ?", (item_id,))
    updated = cursor.fetchone()
    conn.close()
    
    return dict(updated)

@router.delete("/{item_id}")
def delete_item(item_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lost_found_items WHERE id = ?", (item_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")
    conn.commit()
    conn.close()
    return {"message": f"Item #{item_id} deleted successfully"}
