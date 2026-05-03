from fastapi import APIRouter, Depends, HTTPException, Request

from entities.topics import ALL_TOPICS
from .schemas import RecommendRequest, RecommendResponse, MetadataResponse, ScoredSkill, ScoredPosition
from models.recommenders.sage import TeamCompletionSAGE

router = APIRouter()


def get_model(request: Request) -> TeamCompletionSAGE:
    return request.app.state.model


@router.get("/health")
def health():
    return {"status": "ok", "model": "SAGE"}


@router.get("/metadata", response_model=MetadataResponse)
def metadata():
    return MetadataResponse()


@router.post("/recommend", response_model=RecommendResponse)
def recommend(
    body: RecommendRequest,
    model: TeamCompletionSAGE = Depends(get_model),
) -> RecommendResponse:
    if body.topic not in ALL_TOPICS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown topic '{body.topic}'. Valid topics: {ALL_TOPICS}",
        )

    result = model.recommend(
        topic=body.topic,
        max_team_size=body.max_team_size,
        members=[m.model_dump() for m in body.members],
        top_k_skills=body.top_k_skills,
        top_k_positions=body.top_k_positions,
        skill_threshold=body.skill_threshold,
    )

    return RecommendResponse(**result)
