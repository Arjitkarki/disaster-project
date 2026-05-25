from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.api.v1.router import v1_router
from app.services.sync import sync_bipad_to_supabase


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_bipad_to_supabase()

    scheduler = BackgroundScheduler()
    scheduler.add_job(sync_bipad_to_supabase, 'interval', minutes=5)
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(title='Nepal Disaster API', version='0.1.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(v1_router)


@app.get('/health')
async def health():
    return {'status': 'ok'}
