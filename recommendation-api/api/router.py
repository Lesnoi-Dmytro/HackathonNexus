import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from entities.topics import ALL_TOPICS
from core import cache
from core.config import settings
from .schemas import RecommendRequest, RecommendResponse, MetadataResponse, ScoredSkill, ScoredPosition
from models.recommenders.sage import TeamCompletionSAGE

router = APIRouter()

_bearer = HTTPBearer(auto_error=True)


def verify_token(credentials: HTTPAuthorizationCredentials = Security(_bearer)) -> None:
    if not secrets.compare_digest(credentials.credentials, settings.api_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_model(request: Request) -> TeamCompletionSAGE:
    return request.app.state.model


@router.get("/health")
def health():
    return {"status": "ok", "model": "SAGE"}


@router.get("/metadata", response_model=MetadataResponse, dependencies=[Depends(verify_token)])
def metadata():
    return MetadataResponse()


@router.post("/recommend", response_model=RecommendResponse, dependencies=[Depends(verify_token)])
async def recommend(
    body: RecommendRequest,
    model: TeamCompletionSAGE = Depends(get_model),
) -> RecommendResponse:
    if body.topic not in ALL_TOPICS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown topic '{body.topic}'. Valid topics: {ALL_TOPICS}",
        )

    cache_key = cache.make_cache_key(body.model_dump())
    cached = await cache.get_cached(cache_key)
    if cached is not None:
        return RecommendResponse(**cached)

    result = model.recommend(
        topic=body.topic,
        max_team_size=body.max_team_size,
        members=[m.model_dump() for m in body.members],
        top_k_skills=body.top_k_skills,
        top_k_positions=body.top_k_positions,
    )

    await cache.set_cached(cache_key, result)

    return RecommendResponse(**result)
