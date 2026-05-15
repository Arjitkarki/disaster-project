# supabase_client.py
#
# This file creates one shared Supabase client that the rest of the backend imports.
# We only need one client for the whole app — Python modules are cached after the
# first import, so calling `from .supabase_client import supabase` anywhere will
# always return the same object.
#
# The Supabase Python SDK (supabase-py) wraps the Supabase REST API.
# Every table operation (select, insert, update, delete) goes through this client.

from supabase import create_client, Client

# Pull the URL and service key from config.py, which reads them from .env
from ..core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# create_client() connects to your Supabase project.
#
# Why SUPABASE_SERVICE_KEY and not SUPABASE_ANON_KEY?
#   - The anon key is for client-side (browser/mobile) use and is restricted by
#     Row Level Security (RLS) policies.
#   - The service key bypasses RLS entirely — it's for trusted server-side code.
#   - We use it here because this runs on the backend, never exposed to the app.
#
# The client is created once at import time and reused for all requests.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
