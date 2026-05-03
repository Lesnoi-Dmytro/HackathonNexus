FROM python:3.14.4-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake git && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

COPY requirements-server.txt .
RUN pip install --no-cache-dir -r requirements-server.txt

COPY main.py .
COPY api/ api/
COPY core/ core/
COPY entities/ entities/
COPY models/recommenders/sage.py        models/recommenders/sage.py
COPY models/recommenders/graph_utils.py models/recommenders/graph_utils.py

COPY models/output/sage/recommender_sage.pt      models/output/sage/recommender_sage.pt
COPY models/output/sage/tune_cfg_sage.json       models/output/sage/tune_cfg_sage.json

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
