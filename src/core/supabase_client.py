import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis do .env file
load_dotenv()

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")

# Client único a ser exportado e usado em todo o backend
supabase: Client = create_client(url, key)
