from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Literal

from src.core.supabase_client import supabase, supabase_admin

router = APIRouter(prefix="/learning", tags=["Learning"])


class LearningGesturePayload(BaseModel):
    name: str
    level: Literal["iniciante", "intermediario", "avancado"]
    category: str
    description: str
    svg_initial: Optional[str] = ""
    svg_movement: Optional[str] = ""
    svg_final: Optional[str] = ""
    is_active: Optional[bool] = True


def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")

    token = authorization.replace("Bearer ", "")
    try:
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = res.user.id
        profile = supabase.table("profiles").select("role").eq("id", user_id).execute()
        role = profile.data[0]["role"] if len(profile.data) > 0 else "member"
        return {"user_id": user_id, "role": role}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token verification failed: " + str(e))


def require_admin(user: dict = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.get("/gestures")
def list_learning_gestures(
    level: Optional[str] = None,
    category: Optional[str] = None,
    include_inactive: bool = False,
    user: dict = Depends(verify_token),
):
    try:
        query = supabase.table("learning_gestures").select("*").order("name")
        if level:
            query = query.eq("level", level)
        if category:
            query = query.eq("category", category)
        if not include_inactive:
            query = query.eq("is_active", True)

        res = query.execute()
        return {"ok": True, "items": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gestures/{gesture_id}")
def get_learning_gesture(gesture_id: str, user: dict = Depends(verify_token)):
    try:
        res = supabase.table("learning_gestures").select("*").eq("id", gesture_id).limit(1).execute()
        if len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Gesture not found")
        return {"ok": True, "item": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gestures")
def create_learning_gesture(payload: LearningGesturePayload, admin: dict = Depends(require_admin)):
    try:
        res = supabase_admin.table("learning_gestures").insert(payload.model_dump()).execute()
        return {"ok": True, "item": res.data[0] if len(res.data) > 0 else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/gestures/{gesture_id}")
def update_learning_gesture(
    gesture_id: str,
    payload: LearningGesturePayload,
    admin: dict = Depends(require_admin),
):
    try:
        res = (
            supabase_admin.table("learning_gestures")
            .update(payload.model_dump())
            .eq("id", gesture_id)
            .execute()
        )
        if len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Gesture not found")
        return {"ok": True, "item": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/gestures/{gesture_id}")
def delete_learning_gesture(gesture_id: str, admin: dict = Depends(require_admin)):
    try:
        res = supabase_admin.table("learning_gestures").delete().eq("id", gesture_id).execute()
        return {"ok": True, "deleted": len(res.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
