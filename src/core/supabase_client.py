import os
import socket
from urllib.parse import urlparse
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis do .env file
load_dotenv()

# .strip() é essencial: valor colado no painel do Render costuma vir com espaço
# ou \n no fim, e o hostname resultante não resolve ([Errno -2]).
url: str = os.getenv("SUPABASE_URL", "").strip()
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Sem validação, o client é criado mesmo com config inválida e só falha no
# primeiro request — com um erro de DNS que chega ao usuário como
# "credenciais inválidas". Falhar aqui deixa a causa real óbvia no boot.
if not url or not url.startswith("https://"):
    raise RuntimeError(
        "SUPABASE_URL ausente ou inválida — configure a variável de ambiente "
        f"(valor atual: {url!r})"
    )
if not key:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY ausente — configure a variável de ambiente")

# Uma URL com typo passa nas checagens acima mas quebra em toda chamada com
# "[Errno -2] Name or service not known". Resolver o host no boot transforma
# isso numa falha imediata e nomeada, em vez de erro de login para o usuário.
_hostname = urlparse(url).hostname or ""
try:
    socket.gethostbyname(_hostname)
except socket.gaierror as exc:
    raise RuntimeError(
        f"SUPABASE_URL aponta para um host que não resolve: {_hostname!r} ({exc}). "
        "Verifique se a URL está correta e se o projeto Supabase não foi pausado ou removido."
    ) from exc

# Client único a ser exportado e usado em todo o backend
supabase: Client = create_client(url, key)

# Client admin seguro (não sofre mutação ao chamar auth.sign_up)
supabase_admin: Client = create_client(url, key)
