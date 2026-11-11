#!/bin/bash
set -euo pipefail

/usr/local/bin/uv pip install \
  --python /opt/recommendation-venv/bin/python3 \
  --index-strategy unsafe-best-match \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  -r /home/ec2-user/app/requirements-server.txt

systemctl daemon-reload
systemctl enable hackathon-nexus-recommendation-api
systemctl start hackathon-nexus-recommendation-api
