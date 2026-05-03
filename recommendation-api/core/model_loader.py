import json
from pathlib import Path

from models.recommenders.sage import TeamCompletionSAGE

_BASE = Path(__file__).resolve().parent.parent / "models" / "output" / "sage"
_CHECKPOINT = _BASE / "recommender_sage.pt"
_TUNE_CFG = _BASE / "tune_cfg_sage.json"

_HIDDEN_DIM = 128
_NUM_LAYERS = 3


def load_sage_model() -> TeamCompletionSAGE:
    with open(_TUNE_CFG, "r") as f:
        cfg = json.load(f)

    dropout: float = cfg.get("dropout", 0.25)

    return TeamCompletionSAGE.from_checkpoint(
        _CHECKPOINT,
        hidden_dim=_HIDDEN_DIM,
        num_layers=_NUM_LAYERS,
        dropout=dropout,
    )
