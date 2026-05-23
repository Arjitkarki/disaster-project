# supabase_client.py
#
# This file creates one shared Supabase client that the rest of the backend imports.
# We only need one client for the whole app — Python modules are cached after the
# first import, so calling `from .supabase_client import supabase` anywhere will
# always return the same object.
#
# The Supabase Python SDK (supabase-py) wraps the Supabase REST API.
# Every table operation (select, insert, update, delete) goes through this client.

from typing import Optional
from supabase import create_client, Client

from ..core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Only create the client when both env vars are present.
# supabase==2.30+ raises SupabaseException on empty strings, so we guard here.
# While Supabase is dormant (no tables yet), this will be None.
supabase: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY
    else None
)
