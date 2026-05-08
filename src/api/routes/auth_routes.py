import os
from supabase import create_client
from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from pydantic import BaseModel
from src.core.supabase_client import supabase, supabase_admin


router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Payloads ──────────────────────────────────────────

class AuthPayload(BaseModel):
    email: str
    password: str

class RegisterPayload(AuthPayload):
    full_name: str

class ProfileUpdatePayload(BaseModel):
    full_name: str

class RefreshPayload(BaseModel):
    refresh_token: str


# ── Auth Helpers ──────────────────────────────────────

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


# ── Auth Routes ──────────────────────────────────────

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
            supabase_admin.table("profiles").insert({
                "id": user_id, 
                "full_name": payload.full_name,
                "role": "member"
            }).execute()
            
        return {
            "ok": True, 
            "token": res.session.access_token if res.session else None, 
            "refresh_token": res.session.refresh_token if res.session else None,
            "user": res.user.id if res.user else None
        }
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
        
        profile_res = supabase.table("profiles").select("role, full_name, avatar_url").eq("id", user_id).execute()
        role = "member"
        full_name = "User"
        avatar_url = None
        
        if len(profile_res.data) > 0:
            role = profile_res.data[0].get("role", "member")
            full_name = profile_res.data[0].get("full_name", "")
            avatar_url = profile_res.data[0].get("avatar_url", None)
            
        return {
           "ok": True, 
           "token": res.session.access_token, 
           "refresh_token": res.session.refresh_token,
           "user_id": user_id,
           "email": res.user.email,
           "role": role,
           "full_name": full_name,
           "avatar_url": avatar_url
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciais inválidas ou erro no Supabase: " + str(e))

@router.post("/refresh")
async def refresh_token(payload: RefreshPayload):
    """Renova o access_token usando um refresh_token do Supabase."""
    try:
        res = supabase.auth.refresh_session(payload.refresh_token)
        return {
            "ok": True,
            "token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user_id": res.user.id
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Falha ao renovar token: " + str(e))


# ── Profile Routes ──────────────────────────────────

@router.get("/profile")
async def get_profile(user: dict = Depends(verify_token)):
    """Retorna os dados do perfil do usuário autenticado."""
    try:
        user_id = user["user_id"]
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        
        profile = res.data[0]
        return {
            "ok": True,
            "profile": {
                "id": profile.get("id"),
                "full_name": profile.get("full_name", ""),
                "role": profile.get("role", "member"),
                "avatar_url": profile.get("avatar_url", None),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(payload: ProfileUpdatePayload, user: dict = Depends(verify_token)):
    """Atualiza o nome do perfil do usuário autenticado."""
    try:
        user_id = user["user_id"]
        supabase.table("profiles").update({
            "full_name": payload.full_name
        }).eq("id", user_id).execute()
        
        return {"ok": True, "full_name": payload.full_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/upload-avatar")
async def upload_avatar_file(file: UploadFile = File(...), user: dict = Depends(verify_token)):
    """Upload de avatar para Supabase Storage bucket 'avatars'."""
    try:
        import time
        user_id = user["user_id"]
        
        # Pega a URL antiga para podermos apagar o arquivo antigo e evitar lixo no storage
        old_profile = supabase_admin.table("profiles").select("avatar_url").eq("id", user_id).execute()
        old_url = old_profile.data[0].get("avatar_url") if old_profile.data else None
        
        if old_url and "/avatars/" in old_url:
            # A URL publica costuma ser: .../storage/v1/object/public/avatars/ID_NOME.jpg
            old_filename = old_url.split("/avatars/")[-1].split("?")[0]
            try:
                supabase_admin.storage.from_("avatars").remove([old_filename])
            except:
                pass
        
        # Ler o conteúdo do arquivo
        contents = await file.read()
        
        # Definir o caminho no storage COM TIMESTAMP para garantir URL nova (burlar cache)
        file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
        timestamp = int(time.time())
        storage_path = f"{user_id}_{timestamp}.{file_ext}"
        content_type = file.content_type or "image/jpeg"
        
        # Faz o upload do novo arquivo
        res = supabase_admin.storage.from_("avatars").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": content_type}
        )
        
        # Verifica erros de upload
        if hasattr(res, 'status_code') and res.status_code >= 400:
            raise Exception(f"Falha no upload: {res.text if hasattr(res, 'text') else str(res)}")
        elif isinstance(res, dict) and res.get("error"):
            raise Exception(f"Falha no upload: {res.get('error')}")
        
        # Montar a URL pública (não precisamos de cache-buster pq o nome já é único)
        public_url = supabase_admin.storage.from_("avatars").get_public_url(storage_path)
        
        # Atualizar a tabela profiles com a URL do avatar
        supabase_admin.table("profiles").update({
            "avatar_url": public_url
        }).eq("id", user_id).execute()
        
        return {"ok": True, "avatar_url": public_url}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao fazer upload do avatar: {str(e)}")
