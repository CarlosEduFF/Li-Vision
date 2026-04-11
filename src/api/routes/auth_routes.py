import os
from supabase import create_client
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from src.core.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])

class AuthPayload(BaseModel):
    email: str
    password: str

class RegisterPayload(AuthPayload):
    full_name: str

@router.post("/register")
async def register(payload: RegisterPayload):
    try:
        # Registra usando a API Auth do Supabase
        res = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password
        })
        
        # Como o auth as vezes não loga as tabelas imediatamente no schema public num tier free de forma facil,
        # vamos usar uma tabela auxiliar manual para guardarmos os cargos! Ou, podemos tentar via REST:
        user_id = res.user.id if res.user else None
        
        if user_id:
            # Assuma que a primeira pessoa logada não seja necessariamente admin (vamos setar member, e dps o DB root muda dps via banco manual)
            admin_supabase = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            )
            admin_supabase.table("profiles").insert({
                "id": user_id, 
                "full_name": payload.full_name,
                "role": "member"
            }).execute()
            
        return {"ok": True, "token": res.session.access_token if res.session else None, "user": res.user.id if res.user else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(payload: AuthPayload):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        
        # Puxamos o Role desse usuário também para o Mobile saber na hora do fetch
        user_id = res.user.id
        
        profile_res = supabase.table("profiles").select("role, full_name").eq("id", user_id).execute()
        role = "member"
        full_name = "User"
        
        if len(profile_res.data) > 0:
            role = profile_res.data[0].get("role", "member")
            full_name = profile_res.data[0].get("full_name", "")
            
        return {
           "ok": True, 
           "token": res.session.access_token, 
           "user_id": user_id,
           "email": res.user.email,
           "role": role,
           "full_name": full_name
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciais inválidas ou erro no Supabase: " + str(e))

def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    token = authorization.replace("Bearer ", "")
    try:
        # Valida via JWT do Supabase pegando os detalhes do user
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = res.user.id
        # Busca o cargo para validar
        profile = supabase.table("profiles").select("role").eq("id", user_id).execute()
        role = profile.data[0]["role"] if len(profile.data) > 0 else "member"
        
        return {"user_id": user_id, "role": role}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token verification failed: " + str(e))
