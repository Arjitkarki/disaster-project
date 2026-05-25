from pathlib import Path
from dotenv import load_dotenv
import os

# Load from project root .env
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent.parent / '.env')

SUPABASE_URL         = os.getenv('Supabase_Url', '')
SUPABASE_ANON_KEY    = os.getenv('Supabase_Anon_Key', '')
SUPABASE_SERVICE_KEY = os.getenv('Supabase_Secret_Key', '')

