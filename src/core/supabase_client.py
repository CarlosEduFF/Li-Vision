import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis do .env file
load_dotenv()

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Sem essas variáveis o client é criado mesmo assim e só falha no primeiro
# request, com um erro de DNS ([Errno -2]) que aparece para o usuário como
# "credenciais inválidas". Falhar aqui deixa a causa real óbvia no boot.
if not url or not url.startswith("https://"):
    raise RuntimeError(
        "SUPABASE_URL ausente ou inválida — configure a variável de ambiente "
        f"(valor atual: {url!r})"
    )
if not key:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY ausente — configure a variável de ambiente")

# Client único a ser exportado e usado em todo o backend
supabase: Client = create_client(url, key)

# Client admin seguro (não sofre mutação ao chamar auth.sign_up)
supabase_admin: Client = create_client(url, key)
