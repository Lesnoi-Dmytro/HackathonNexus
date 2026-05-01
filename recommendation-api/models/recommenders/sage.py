import sys
import torch
import torch.nn.functional as F
from pathlib import Path
from torch_geometric.nn import HeteroConv, SAGEConv, Linear
from entities.skills import ALL_SKILLS, SKILL_TO_IDX, N_SKILLS
from entities.positions import ALL_POSITIONS, POSITION_TO_IDX, N_POSITIONS
from .graph_utils import (
    PARTICIPANT_DIM, SKILL_DIM, HACKATHON_DIM, TOPIC_DIM, TEAM_DIM,
    build_inference_graph,
)

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

_EDGE_TYPES = [
    ("participant", "has_skill", "skill"),
    ("participant", "member_of", "team"),
    ("team", "participated_in", "hackathon"),
    ("hackathon", "has_topic", "topic"),
    ("skill", "skill_of", "participant"),
    ("team", "has_member", "participant"),
    ("hackathon", "hosts", "team"),
    ("topic", "topic_of", "hackathon"),
]


class TeamCompletionSAGE(torch.nn.Module):
    def __init__(self, hidden_dim: int = 128, num_layers: int = 3, dropout: float = 0.25):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.dropout = torch.nn.Dropout(dropout)

        self.input_proj = torch.nn.ModuleDict({
            "participant": Linear(PARTICIPANT_DIM, hidden_dim),
            "skill": Linear(SKILL_DIM, hidden_dim),
            "hackathon": Linear(HACKATHON_DIM, hidden_dim),
            "topic": Linear(TOPIC_DIM, hidden_dim),
            "team": Linear(TEAM_DIM, hidden_dim),
        })

        self.convs = torch.nn.ModuleList([
            HeteroConv(
                {et: SAGEConv((hidden_dim, hidden_dim), hidden_dim) for et in _EDGE_TYPES},
                aggr="mean",
            )
            for _ in range(num_layers)
        ])

        self.skill_query_proj = torch.nn.Sequential(
            Linear(hidden_dim, hidden_dim),
            torch.nn.ReLU(),
            torch.nn.Dropout(dropout),
            Linear(hidden_dim, hidden_dim),
        )

        self.position_head = torch.nn.Sequential(
            Linear(hidden_dim, hidden_dim),
            torch.nn.ReLU(),
            torch.nn.Dropout(dropout),
            Linear(hidden_dim, N_POSITIONS),
        )

    def encode(self, x_dict: dict, edge_index_dict: dict) -> dict:
        h = {nt: self.dropout(F.relu(self.input_proj[nt](x))) for nt, x in x_dict.items()}
        for conv in self.convs:
            h_new = conv(h, edge_index_dict)
            h = {
                k: (
                    self.dropout(F.layer_norm(F.relu(h_new[k]) + h[k], [self.hidden_dim]))
                    if k in h_new else h[k]
                )
                for k in h
            }
        return h

    def forward(self, x_dict: dict, edge_index_dict: dict) -> dict:
        """
        Returns raw logits for all teams in the graph.

        Returns
        -------
        skill_logits    : (num_teams, N_SKILLS)
        position_logits : (num_teams, N_POSITIONS)
        """
        h = self.encode(x_dict, edge_index_dict)
        team_query = self.skill_query_proj(h["team"])

        batch_size = h["team"].shape[0]
        skill_h = h["skill"].view(batch_size, N_SKILLS, self.hidden_dim)
        skill_logits = (team_query.unsqueeze(1) @ skill_h.transpose(1, 2)).squeeze(1)

        return {
            "skill_logits": skill_logits,
            "position_logits": self.position_head(h["team"]),
        }

    @torch.no_grad()
    def recommend(
            self,
            topic: str,
            max_team_size: int,
            members: list[dict],
            top_k_skills: int | None = None,
            top_k_positions: int | None = None,
            skill_threshold: float = 0.5,
    ) -> dict:
        """
        Recommend skills and positions for a partial hackathon team.

        Parameters
        ----------
        topic             : hackathon topic (one of ALL_TOPICS)
        max_team_size     : maximum team size for this hackathon
        members           : current team members. Each dict must contain:
                              - "skills"           : list[str]
                              - "position"         : str
                              - "experience_years" : float  (optional, default 0)
                            Pass an empty list for a fresh/cold-start search.
        top_k_skills      : number of skill recommendations to return. When None
                            (default), inferred as missing_slots * 4 where
                            missing_slots = max(1, max_team_size - len(members)).
        top_k_positions   : number of position recommendations to return. When None
                            (default), inferred as missing_slots.
        skill_threshold   : sigmoid threshold for skill prediction (default 0.5,
                            consistent with training). Skills above threshold are
                            returned first; top_k acts as an upper cap.

        Returns
        -------
        {
          "recommended_skills"    : list[str],
          "recommended_positions" : list[str],
        }
        """
        missing_slots = max(1, max_team_size - len(members))
        if top_k_skills is None:
            top_k_skills = min(N_SKILLS, missing_slots * 4)
        if top_k_positions is None:
            top_k_positions = min(N_POSITIONS, missing_slots)

        device = next(self.parameters()).device
        data = build_inference_graph(topic, max_team_size, members).to(device)
        out = self(data.x_dict, data.edge_index_dict)

        skill_logits = out["skill_logits"][0].clone()
        pos_logits = out["position_logits"][0].clone()

        present_skills = {
            SKILL_TO_IDX[s]
            for m in members
            for s in m.get("skills", [])
            if s in SKILL_TO_IDX
        }
        if present_skills:
            skill_logits[list(present_skills)] = float("-inf")

        present_positions = {
            POSITION_TO_IDX[m["position"]]
            for m in members
            if m.get("position") in POSITION_TO_IDX
        }
        if present_positions:
            pos_logits[list(present_positions)] = float("-inf")

        skill_probs = torch.sigmoid(skill_logits)
        above_thresh = (skill_probs > skill_threshold).nonzero(as_tuple=True)[0]
        if len(above_thresh) > 0:
            ranked = above_thresh[skill_probs[above_thresh].argsort(descending=True)]
            top_skill_ids = ranked[:top_k_skills].tolist()
        else:
            top_skill_ids = skill_logits.argsort(descending=True)[:top_k_skills].tolist()

        top_pos_ids = pos_logits.argsort(descending=True)[:top_k_positions].tolist()

        return {
            "recommended_skills": [ALL_SKILLS[i] for i in top_skill_ids],
            "recommended_positions": [ALL_POSITIONS[i] for i in top_pos_ids],
        }

    def save(self, path: str | Path) -> None:
        torch.save(self.state_dict(), path)

    @classmethod
    def from_checkpoint(
            cls,
            path: str | Path,
            hidden_dim: int = 128,
            num_layers: int = 3,
            dropout: float = 0.25,
            device: torch.device | str = "cpu",
    ) -> "TeamCompletionSAGE":
        model = cls(hidden_dim, num_layers, dropout)
        model.load_state_dict(torch.load(path, map_location=device, weights_only=True))
        model.eval()
        return model
