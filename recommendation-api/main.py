from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.config import settings
from core.model_loader import load_sage_model
from core import cache
from api.router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = load_sage_model()
    await cache.connect()
    yield
    await cache.disconnect()


app = FastAPI(
    title="Team Completion Recommendation API",
    description=(
        "Given a partial hackathon team composition, recommends the missing "
        "skills and roles using a GraphSAGE-based model."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)

