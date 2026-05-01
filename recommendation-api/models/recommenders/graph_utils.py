import sys
import numpy as np
import torch
from pathlib import Path
from torch_geometric.data import HeteroData
from entities.skills import SKILL_TO_IDX, N_SKILLS
from entities.positions import POSITION_TO_IDX, N_POSITIONS
from entities.topics import TOPIC_TO_IDX, N_TOPICS

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

EXP_MAX = 25.0
PARTICIPANT_DIM = 1 + N_POSITIONS + N_SKILLS
SKILL_DIM = N_SKILLS
TOPIC_DIM = N_TOPICS
HACKATHON_DIM = 1
TEAM_DIM = 2

def participant_features(
        position: str,
        skills: list[str],
        experience_years: float = 0.0,
) -> np.ndarray:
    exp_vec = np.array([min(experience_years / EXP_MAX, 1.0)], dtype=np.float32)
    pos_vec = np.zeros(N_POSITIONS, dtype=np.float32)
    skill_vec = np.zeros(N_SKILLS, dtype=np.float32)

    if position in POSITION_TO_IDX:
        pos_vec[POSITION_TO_IDX[position]] = 1.0
    for s in skills:
        if s in SKILL_TO_IDX:
            skill_vec[SKILL_TO_IDX[s]] = 1.0

    return np.concatenate([exp_vec, pos_vec, skill_vec])


def hackathon_features(topic: str, max_team_size: int, size_max: float = 6.0) -> np.ndarray:
    return np.array([max_team_size / size_max], dtype=np.float32)


def topic_features(topic: str) -> np.ndarray:
    vec = np.zeros(N_TOPICS, dtype=np.float32)
    if topic in TOPIC_TO_IDX:
        vec[TOPIC_TO_IDX[topic]] = 1.0
    return vec


def team_features(members: list[dict], max_team_size: int) -> np.ndarray:
    n = len(members)
    cap = max(max_team_size, 1)

    if n == 0:
        return np.array([0.0, 0.0], dtype=np.float32)

    total_exp = 0.0
    for m in members:
        total_exp += m.get("experience_years", 0.0)

    return np.array([
        n / cap,
        min(total_exp / n / EXP_MAX, 1.0),
    ], dtype=np.float32)


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_inference_graph(
        topic: str,
        max_team_size: int,
        members: list[dict],
) -> HeteroData:
    data = HeteroData()

    data["topic"].x = torch.tensor(np.eye(N_TOPICS, dtype=np.float32), dtype=torch.float)

    data["hackathon"].x = torch.tensor(
        hackathon_features(topic, max_team_size), dtype=torch.float
    ).unsqueeze(0)

    data["team"].x = torch.tensor(
        team_features(members, max_team_size), dtype=torch.float
    ).unsqueeze(0)

    data["skill"].x = torch.tensor(
        np.eye(N_SKILLS, dtype=np.float32), dtype=torch.float
    )

    if members:
        x_part = np.stack([
            participant_features(
                m.get("position", ""),
                m.get("skills", []),
                m.get("experience_years", 0.0),
            )
            for m in members
        ])
        data["participant"].x = torch.tensor(x_part, dtype=torch.float)
    else:
        data["participant"].x = torch.zeros((1, PARTICIPANT_DIM))

    src_p, dst_s = [], []
    for pid, m in enumerate(members):
        for s in m.get("skills", []):
            if s in SKILL_TO_IDX:
                src_p.append(pid)
                dst_s.append(SKILL_TO_IDX[s])
    ei_has_skill = (
        torch.tensor([src_p, dst_s], dtype=torch.long)
        if src_p
        else torch.zeros((2, 0), dtype=torch.long)
    )

    if members:
        ei_member_of = torch.tensor(
            [list(range(len(members))), [0] * len(members)], dtype=torch.long
        )
    else:
        ei_member_of = torch.zeros((2, 0), dtype=torch.long)

    ei_participated = torch.tensor([[0], [0]], dtype=torch.long)

    t_idx = TOPIC_TO_IDX.get(topic, None)
    if t_idx is not None:
        ei_hack_topic = torch.tensor([[0], [t_idx]], dtype=torch.long)
    else:
        ei_hack_topic = torch.zeros((2, 0), dtype=torch.long)

    data["participant", "has_skill", "skill"].edge_index = ei_has_skill
    data["participant", "member_of", "team"].edge_index = ei_member_of
    data["team", "participated_in", "hackathon"].edge_index = ei_participated
    data["hackathon", "has_topic", "topic"].edge_index = ei_hack_topic

    data["skill", "skill_of", "participant"].edge_index = ei_has_skill.flip(0)
    data["team", "has_member", "participant"].edge_index = ei_member_of.flip(0)
    data["hackathon", "hosts", "team"].edge_index = ei_participated.flip(0)
    data["topic", "topic_of", "hackathon"].edge_index = ei_hack_topic.flip(0)

    return data
