import json
import pandas as pd
import openpyxl
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "output"

COLUMN_LABELS = {
    "train_loss":  "Train Loss",
    "val_loss":    "Val Loss",
    "tr_sk_p":     "Train Skill Precision",
    "tr_sk_r":     "Train Skill Recall",
    "tr_sk_f1":    "Train Skill F1",
    "tr_sk_ndcg":  "Train Skill NDCG@6",
    "tr_sk_mrr":   "Train Skill MRR",
    "tr_po_p":     "Train Position Precision",
    "tr_po_r":     "Train Position Recall",
    "tr_po_f1":    "Train Position F1",
    "v_sk_p":      "Val Skill Precision",
    "v_sk_r":      "Val Skill Recall",
    "v_sk_f1":     "Val Skill F1",
    "v_sk_ndcg":   "Val Skill NDCG@6",
    "v_sk_mrr":    "Val Skill MRR",
    "v_po_p":      "Val Position Precision",
    "v_po_r":      "Val Position Recall",
    "v_po_f1":     "Val Position F1",
}

MODELS = {
    "HGT":  OUTPUT_DIR / "hgt"  / "recommender_hgt_ckpt.json",
    "SAGE": OUTPUT_DIR / "sage" / "recommender_sage_ckpt.json",
}

out_path = OUTPUT_DIR / "training_history.xlsx"

with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
    for model_name, json_path in MODELS.items():
        with open(json_path) as f:
            history = json.load(f)

        n_epochs = len(history["train_loss"])
        df = pd.DataFrame({"Epoch": range(1, n_epochs + 1)})

        for key, label in COLUMN_LABELS.items():
            if key in history:
                df[label] = [round(v, 4) for v in history[key]]

        df.to_excel(writer, sheet_name=model_name, index=False)

        worksheet = writer.sheets[model_name]
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col) + 2
            worksheet.column_dimensions[col[0].column_letter].width = max_len

print(f"Saved: {out_path}")
