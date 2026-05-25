from cachetools import TTLCache

# Holds the full incidents list. TTL matches the sync interval (5 min).
# Cleared by sync.py after each successful BIPAD → Supabase sync.
incidents_cache: TTLCache = TTLCache(maxsize=1, ttl=300)
INCIDENTS_KEY = 'incidents'
