#!/usr/bin/env bash
set -e

PR_NUMBER=$(gh pr view --json number --jq '.number')
HEAD_SHA=$(gh pr view --json headRefOid --jq '.headRefOid')

CHECK_JSON=$(gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" \
  --jq '[.check_runs[] | select(.name | ascii_downcase | contains("sonar"))] | .[0]')

if [ "$CHECK_JSON" = "null" ] || [ -z "$CHECK_JSON" ]; then
  echo "ERROR: No SonarCloud check run found on $HEAD_SHA"
  gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" --jq '.check_runs[].name'
  exit 1
fi

CHECK_RUN_ID=$(echo "$CHECK_JSON" | jq -r '.id')
CHECKS_URL="https://github.com/$(gh repo view --json nameWithOwner --jq '.nameWithOwner')/pull/$PR_NUMBER/checks?check_run_id=$CHECK_RUN_ID"

gh api "repos/{owner}/{repo}/check-runs/$CHECK_RUN_ID" \
  --jq "\"CHECKS_URL: $CHECKS_URL\nConclusion: \(.conclusion)\nTitle:      \(.output.title)\nSummary:\n\(.output.summary)\""

gh api "repos/{owner}/{repo}/check-runs/$CHECK_RUN_ID/annotations" \
  | jq -r '.[] | "[\(.annotation_level | ascii_upcase)] \(.title)\n  File: \(.path):\(.start_line)\n  \(.message)\n"'
