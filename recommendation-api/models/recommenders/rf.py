import sys
import pickle
import numpy as np
from pathlib import Path
from joblib import Parallel, delayed
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from entities.skills import ALL_SKILLS, SKILL_TO_IDX, N_SKILLS
from entities.positions import ALL_POSITIONS, POSITION_TO_IDX, N_POSITIONS
from entities.topics import N_TOPICS
from .graph_utils import build_inference_graph

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

NDCG_K = 6


def _ndcg_at_k_np(scores: np.ndarray, tgt: np.ndarray, k: int = NDCG_K) -> float:
    k = min(k, scores.shape[1])
    discounts = 1.0 / np.log2(np.arange(2, k + 2, dtype=np.float32))
    ndcgs = []
    for s, t in zip(scores, tgt):
        top_idx = np.argpartition(s, -k)[-k:]
        top_idx = top_idx[np.argsort(s[top_idx])[::-1]]
        dcg = float((t[top_idx] * discounts).sum())
        ideal = float((np.sort(t)[::-1][:k] * discounts).sum())
        ndcgs.append(dcg / ideal if ideal > 0 else 0.0)
    return float(np.mean(ndcgs))


def _mrr_np(scores: np.ndarray, tgt: np.ndarray) -> float:
    rrs = []
    for s, t in zip(scores, tgt):
        if t.sum() == 0:
            rrs.append(0.0)
            continue
        ranked = np.argsort(s)[::-1]
        hits = np.where(t[ranked] > 0)[0]
        rrs.append(1.0 / (hits[0] + 1) if len(hits) > 0 else 0.0)
    return float(np.mean(rrs))


def _sample_to_features(sample) -> np.ndarray:
    t_idx = int(sample["hackathon", "has_topic", "topic"].edge_index[1][0].item())
    topic_vec = np.zeros(N_TOPICS, dtype=np.float32)
    topic_vec[t_idx] = 1.0

    x_h = sample["hackathon"].x[0].numpy()
    x_t = sample["team"].x[0].numpy()

    x_p = sample["participant"].x.numpy()
    mean_p = x_p.mean(axis=0)

    return np.concatenate([topic_vec, x_h, x_t, mean_p])


def _build_xy(samples):
    X = np.stack([_sample_to_features(s) for s in samples])
    y_skill = np.stack(
        [s["team"].sk_tgt[0].numpy().astype(np.int32) for s in samples]
    )
    y_pos = np.stack(
        [s["team"].po_tgt[0].numpy().astype(np.int32) for s in samples]
    )
    weights = np.array([s["team"].sample_weight[0].item() for s in samples], dtype=np.float32)
    return X, y_skill, y_pos, weights


def _proba_from_estimators(estimators, X: np.ndarray) -> np.ndarray:
    cols = []
    for est in estimators:
        p = est.predict_proba(X)
        if p.shape[1] == 2:
            cols.append(p[:, 1])
        else:
            fill = p[:, 0] if int(est.classes_[0]) == 1 else np.zeros(len(X), dtype=np.float32)
            cols.append(fill)
    return np.stack(cols, axis=1)


def _fit_warm(
        est: RandomForestClassifier,
        n_trees: int,
        X: np.ndarray,
        y_col: np.ndarray,
        weights: np.ndarray,
) -> RandomForestClassifier:
    est.set_params(n_estimators=n_trees)
    est.fit(X, y_col, sample_weight=weights)
    return est


def _quick_f1(ests, X_sub: np.ndarray, y_sub: np.ndarray) -> float:
    proba = _proba_from_estimators(ests, X_sub)
    pred = (proba >= 0.5).astype(int)
    tp = float((pred * y_sub).sum())
    fp = float((pred * (1 - y_sub)).sum())
    fn = float(((1 - pred) * y_sub).sum())
    prec = tp / (tp + fp + 1e-8)
    rec = tp / (tp + fn + 1e-8)
    return 2 * prec * rec / (prec + rec + 1e-8)


class TeamCompletionRF:
    def __init__(
            self,
            n_estimators: int = 200,
            max_depth: int | None = 12,
            min_samples_leaf: int = 2,
            n_jobs: int = -1,
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.n_jobs = n_jobs
        self.is_fitted: bool = False

        base_sk = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=min_samples_leaf,
            class_weight="balanced",
            n_jobs=1,
            random_state=42,
        )
        base_po = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=min_samples_leaf,
            class_weight="balanced",
            n_jobs=1,
            random_state=42,
        )
        self.rf_skill = MultiOutputClassifier(base_sk, n_jobs=n_jobs)
        self.rf_position = MultiOutputClassifier(base_po, n_jobs=n_jobs)

    def fit(
            self,
            samples,
            verbose: bool = True,
            n_steps: int = 10,
            val_samples=None,
    ) -> "TeamCompletionRF":
        if verbose:
            print(f"Building feature matrix from {len(samples)} samples")
        X, y_skill, y_pos, weights = _build_xy(samples)
        if verbose:
            print(
                f"\t{"X":8s} {X.shape}\n"
                f"\t{"y_skill":8s} {y_skill.shape}\tpos-rate={y_skill.mean():.3f}\n"
                f"\t{"y_pos":8s} {y_pos.shape}\tpos-rate={y_pos.mean():.3f}"
            )

        if val_samples is not None:
            X_eval, y_sk_eval, y_po_eval, _ = _build_xy(val_samples)
            eval_label = "val"
        else:
            X_eval, y_sk_eval, y_po_eval = X, y_skill, y_pos
            eval_label = "train"
        rng = np.random.default_rng(0)
        eval_idx = rng.choice(len(X_eval), size=min(1000, len(X_eval)), replace=False)
        X_sub = X_eval[eval_idx]
        y_sk_sub = y_sk_eval[eval_idx]
        y_po_sub = y_po_eval[eval_idx]

        trees_per_step = max(1, self.n_estimators // n_steps)
        _base_params = dict(
            max_depth=self.max_depth,
            min_samples_leaf=self.min_samples_leaf,
            class_weight="balanced",
            warm_start=True,
            n_jobs=1,
            random_state=42,
        )
        skill_ests = [
            RandomForestClassifier(n_estimators=trees_per_step, **_base_params)
            for _ in range(N_SKILLS)
        ]
        pos_ests = [
            RandomForestClassifier(n_estimators=trees_per_step, **_base_params)
            for _ in range(N_POSITIONS)
        ]

        if verbose:
            print(
                f"\nFitting [{N_SKILLS} skill + {N_POSITIONS} position outputs] "
                f"{self.n_estimators} trees * {n_steps} steps "
                f"({trees_per_step} trees/step) "
                f"metrics on {eval_label} subsample (n={len(eval_idx)})"
            )
            print(f"\nStep  | Trees | Skill F1 | Position F1")
            print("─" * 40)

        for step in range(1, n_steps + 1):
            n_trees = min(step * trees_per_step, self.n_estimators)

            skill_ests = Parallel(n_jobs=self.n_jobs)(
                delayed(_fit_warm)(est, n_trees, X, y_skill[:, i], weights)
                for i, est in enumerate(skill_ests)
            )
            pos_ests = Parallel(n_jobs=self.n_jobs)(
                delayed(_fit_warm)(est, n_trees, X, y_pos[:, i], weights)
                for i, est in enumerate(pos_ests)
            )

            if verbose:
                sk_f1 = _quick_f1(skill_ests, X_sub, y_sk_sub)
                po_f1 = _quick_f1(pos_ests, X_sub, y_po_sub)
                print(
                    f"{step:2d}/{n_steps:2d} | {n_trees:5d} "
                    f"| {sk_f1:.4f}   | {po_f1:.4f}"
                )

        self.rf_skill.estimators_ = skill_ests
        self.rf_position.estimators_ = pos_ests
        self.is_fitted = True

        return self

    def predict_proba_samples(self, samples):
        X = np.stack([_sample_to_features(s) for s in samples])
        sk_proba = _proba_from_estimators(self.rf_skill.estimators_, X)
        po_proba = _proba_from_estimators(self.rf_position.estimators_, X)
        return sk_proba, po_proba

    def evaluate(
            self,
            samples,
            threshold: float = 0.5,
    ) -> dict:
        _, y_skill, y_pos, _ = _build_xy(samples)
        sk_proba, po_proba = self.predict_proba_samples(samples)

        sk_pred = (sk_proba >= threshold).astype(int)
        po_pred = (po_proba >= threshold).astype(int)

        def _f1(pred, tgt):
            tp = float((pred * tgt).sum())
            fp = float((pred * (1 - tgt)).sum())
            fn = float(((1 - pred) * tgt).sum())
            prec = tp / (tp + fp + 1e-8)
            rec = tp / (tp + fn + 1e-8)
            f1 = 2 * prec * rec / (prec + rec + 1e-8)
            return prec, rec, f1

        sk_p, sk_r, sk_f1 = _f1(sk_pred, y_skill)
        po_p, po_r, po_f1 = _f1(po_pred, y_pos)
        sk_ndcg = _ndcg_at_k_np(sk_proba, y_skill)
        sk_mrr = _mrr_np(sk_proba, y_skill)
        return {
            "sk_precision": sk_p, "sk_recall": sk_r, "sk_f1": sk_f1,
            "sk_ndcg": sk_ndcg, "sk_mrr": sk_mrr,
            "po_precision": po_p, "po_recall": po_r, "po_f1": po_f1,
        }

    def recommend(
            self,
            topic: str,
            max_team_size: int,
            members: list[dict],
            top_k_skills: int | None = None,
            top_k_positions: int | None = None,
            skill_threshold: float = 0.5,
    ) -> dict:
        missing_slots = max(1, max_team_size - len(members))
        if top_k_skills is None:
            top_k_skills = min(N_SKILLS, missing_slots * 4)
        if top_k_positions is None:
            top_k_positions = min(N_POSITIONS, missing_slots)

        sample = build_inference_graph(topic, max_team_size, members)
        X = _sample_to_features(sample).reshape(1, -1)

        sk_proba = _proba_from_estimators(self.rf_skill.estimators_, X)[0]
        po_proba = _proba_from_estimators(self.rf_position.estimators_, X)[0]

        present_skills = {
            SKILL_TO_IDX[s]
            for m in members
            for s in m.get("skills", [])
            if s in SKILL_TO_IDX
        }
        if present_skills:
            sk_proba[list(present_skills)] = 0.0

        present_positions = {
            POSITION_TO_IDX[m["position"]]
            for m in members
            if m.get("position") in POSITION_TO_IDX
        }
        if present_positions:
            po_proba[list(present_positions)] = 0.0

        above_thresh = np.where(sk_proba > skill_threshold)[0]
        if len(above_thresh) > 0:
            ranked = above_thresh[sk_proba[above_thresh].argsort()[::-1]]
            top_skill_ids = ranked[:top_k_skills].tolist()
        else:
            top_skill_ids = sk_proba.argsort()[::-1][:top_k_skills].tolist()

        top_pos_ids = po_proba.argsort()[::-1][:top_k_positions].tolist()

        return {
            "recommended_skills": [
                {"skill": ALL_SKILLS[i], "score": round(float(sk_proba[i]), 4)}
                for i in top_skill_ids
            ],
            "recommended_positions": [
                {"position": ALL_POSITIONS[i], "score": round(float(po_proba[i]), 4)}
                for i in top_pos_ids
            ],
        }

    def save(self, path: str | Path) -> None:
        with open(path, "wb") as fh:
            pickle.dump(
                {
                    "rf_skill": self.rf_skill,
                    "rf_position": self.rf_position,
                    "n_estimators": self.n_estimators,
                    "max_depth": self.max_depth,
                    "min_samples_leaf": self.min_samples_leaf,
                },
                fh,
                protocol=pickle.HIGHEST_PROTOCOL,
            )

    @classmethod
    def from_checkpoint(cls, path: str | Path) -> "TeamCompletionRF":
        with open(path, "rb") as fh:
            d = pickle.load(fh)
        model = cls(
            n_estimators=d["n_estimators"],
            max_depth=d["max_depth"],
            min_samples_leaf=d.get("min_samples_leaf", 2),
        )
        model.rf_skill = d["rf_skill"]
        model.rf_position = d["rf_position"]
        model.is_fitted = True
        return model
