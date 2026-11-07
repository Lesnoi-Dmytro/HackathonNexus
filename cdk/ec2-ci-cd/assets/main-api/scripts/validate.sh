#!/bin/bash
URL="http://localhost:80/api/health"
MAX_ATTEMPTS=30
SLEEP_SECONDS=5

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL" || true)
  if [ "$STATUS" = "200" ]; then
    echo "Health check passed (attempt $i)"
    exit 0
  fi
  echo "Health check attempt $i/$MAX_ATTEMPTS failed (HTTP ${STATUS:-none}), retrying in ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done

echo "Health check failed after $MAX_ATTEMPTS attempts: $URL"
systemctl status hackathon-nexus-api --no-pager || true
exit 1
