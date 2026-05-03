from pydantic import BaseModel, Field

from entities.topics import ALL_TOPICS
from entities.skills import ALL_SKILLS
from entities.positions import ALL_POSITIONS


class TeamMember(BaseModel):
    skills: list[str] = Field(default_factory=list, description="Skills the member has")
    position: str = Field(..., description="Member's role/position")
    experience_years: float = Field(default=0.0, ge=0.0, description="Years of experience")


class RecommendRequest(BaseModel):
    topic: str = Field(..., description=f"Hackathon topic. One of: {ALL_TOPICS}")
    max_team_size: int = Field(..., ge=1, description="Maximum allowed team size")
    members: list[TeamMember] = Field(
        min_length=1,
        description="Current team members. At least one member is required.",
    )
    top_k_skills: int | None = Field(
        default=None,
        ge=1,
        description="Max number of skill recommendations. Defaults to missing_slots.",
    )
    top_k_positions: int | None = Field(
        default=None,
        ge=1,
        description="Max number of position recommendations. Defaults to missing_slots.",
    )
    skill_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Sigmoid threshold for skill prediction.",
    )


class ScoredSkill(BaseModel):
    skill: str
    score: float = Field(..., ge=0.0, le=1.0, description="Sigmoid probability from the model")


class ScoredPosition(BaseModel):
    position: str
    score: float = Field(..., ge=0.0, le=1.0, description="Sigmoid probability from the model")


class RecommendResponse(BaseModel):
    recommended_skills: list[ScoredSkill]
    recommended_positions: list[ScoredPosition]


class MetadataResponse(BaseModel):
    topics: list[str] = ALL_TOPICS
    positions: list[str] = ALL_POSITIONS
    skills: list[str] = ALL_SKILLS
