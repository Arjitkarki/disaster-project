from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import v1_router
from app.services.notifier import start_notifier


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_notifier()
    yield


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
