#!/usr/bin/env bash
set -uo pipefail

PR_NUMBER=$(gh pr view --json number --jq '.number')
HEAD_SHA=$(gh pr view --json headRefOid --jq '.headRefOid')

CHECK_JSON=$(gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" \
  --jq '[.check_runs[] | select(.name | ascii_downcase | contains("sonar"))] | .[0]')

if [ "$CHECK_JSON" = "null" ] || [ -z "$CHECK_JSON" ]; then
  echo "ERROR: No SonarCloud check run found on $HEAD_SHA"
  echo ""
  echo "Other check runs on this commit:"
  gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" \
    --jq '.check_runs[] | "  \(.conclusion // .status | ascii_upcase)  \(.name)  \(.details_url)"'

  echo ""
  FAILED=$(gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" \
    --jq '[.check_runs[] | select(.conclusion == "failure")] | .[0]')
  if [ "$FAILED" != "null" ] && [ -n "$FAILED" ]; then
    RUN_URL=$(echo "$FAILED" | jq -r '.details_url')
    RUN_NAME=$(echo "$FAILED" | jq -r '.name')
    echo "Failed check: $RUN_NAME"
    echo "Details: $RUN_URL"
    RUN_ID=$(echo "$RUN_URL" | grep -oP 'runs/\K[0-9]+')
    if [ -n "$RUN_ID" ]; then
      echo ""
      echo "Failed log output:"
      gh run view "$RUN_ID" --log-failed 2>/dev/null | tail -40
    fi
  fi
  exit 0
fi

CHECK_RUN_ID=$(echo "$CHECK_JSON" | jq -r '.id')
CHECKS_URL="https://github.com/$(gh repo view --json nameWithOwner --jq '.nameWithOwner')/pull/$PR_NUMBER/checks?check_run_id=$CHECK_RUN_ID"

gh api "repos/{owner}/{repo}/check-runs/$CHECK_RUN_ID" \
  --jq "\"CHECKS_URL: $CHECKS_URL\nConclusion: \(.conclusion)\nTitle:      \(.output.title)\nSummary:\n\(.output.summary)\""

gh api "repos/{owner}/{repo}/check-runs/$CHECK_RUN_ID/annotations" \
  | jq -r '.[] | "[\(.annotation_level | ascii_upcase)] \(.title)\n  File: \(.path):\(.start_line)\n  \(.message)\n"'
