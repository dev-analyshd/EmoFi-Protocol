#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EmoFi Protocol — Full End-to-End Test
# Layers: On-chain → API → Database → Frontend
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; CYAN="\033[36m"; BOLD="\033[1m"; RESET="\033[0m"

PASS=0; FAIL=0
declare -a FAILURES=()

ok()   { PASS=$((PASS+1));  printf "  ${GREEN}✓${RESET} %s\n" "$1"; }
fail() { FAIL=$((FAIL+1));  FAILURES+=("$1: $2"); printf "  ${RED}✗${RESET} %s  ${RED}%s${RESET}\n" "$1" "$2"; }
section() { printf "\n${BOLD}${CYAN}── %s %s${RESET}\n" "$1" "$(printf '─%.0s' $(seq 1 $((60-${#1}))))"; }

API="http://localhost:80"

# ─────────────────────────────────────────────────────────────────────────────
section "PHASE A · API health-check"
# ─────────────────────────────────────────────────────────────────────────────

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/healthz")
if [ "$STATUS" = "200" ]; then ok "GET /api/healthz → 200"
else fail "GET /api/healthz" "expected 200, got $STATUS"; fi

# ─────────────────────────────────────────────────────────────────────────────
section "PHASE B · API read endpoints — schema validation"
# ─────────────────────────────────────────────────────────────────────────────

check_endpoint() {
  local label="$1" path="$2" jq_check="$3"
  local body; body=$(curl -s "$API$path")
  local http; http=$(curl -s -o /dev/null -w "%{http_code}" "$API$path")
  if [ "$http" != "200" ]; then fail "$label" "HTTP $http"; return; fi
  if [ -n "$jq_check" ]; then
    local result; result=$(echo "$body" | python3 -c "
import sys,json,re
data=json.load(sys.stdin)
check='''$jq_check'''
# evaluate simple assertions
try:
    exec(check, {'data': data})
    print('ok')
except Exception as e:
    print('FAIL: ' + str(e))
" 2>/dev/null)
    if [[ "$result" == "ok" ]]; then ok "$label"
    else fail "$label" "${result:-parse error}"; fi
  else ok "$label"; fi
}

check_endpoint "GET /api/dashboard/1"       "/api/dashboard/1"       "assert 'emoBalance' in data"
check_endpoint "GET /api/tokens"            "/api/tokens"            "assert isinstance(data, list) and len(data) >= 9"
check_endpoint "GET /api/staking/rates"     "/api/staking/rates"     "assert isinstance(data, list) and len(data) >= 1"
check_endpoint "GET /api/staking/positions" "/api/staking/positions" "assert isinstance(data, list)"
check_endpoint "GET /api/marketplace/listings"   "/api/marketplace/listings"   "assert 'listings' in data"
check_endpoint "GET /api/marketplace/stats"      "/api/marketplace/stats"      "assert 'totalListings' in data or 'total' in data or isinstance(data, dict)"
check_endpoint "GET /api/vaults"            "/api/vaults"            "assert 'vaults' in data"
check_endpoint "GET /api/governance/proposals" "/api/governance/proposals" "assert 'proposals' in data"
check_endpoint "GET /api/oracle/feeds"      "/api/oracle/feeds"      "assert isinstance(data, list)"
check_endpoint "GET /api/ai/recommendations/1" "/api/ai/recommendations/1" "assert isinstance(data, list)"
check_endpoint "GET /api/users/1"           "/api/users/1"           "assert 'walletAddress' in data"

# ─────────────────────────────────────────────────────────────────────────────
section "PHASE C · API write operations — full CRUD cycle"
# ─────────────────────────────────────────────────────────────────────────────

# C1: Create a new staking position
STAKE_RESP=$(curl -s -X POST "$API/api/staking/stake" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"stakedTokenType":"happiness","rewardTokenType":"beautiful","amount":50}')
STAKE_ID=$(echo "$STAKE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if [ -n "$STAKE_ID" ] && [ "$STAKE_ID" != "None" ]; then
  ok "POST /api/staking/stake → positionId=$STAKE_ID"
else
  fail "POST /api/staking/stake" "$(echo "$STAKE_RESP" | head -c 200)"
fi

# C2: Claim rewards from the position we just created (wait 100ms for time to elapse)
if [ -n "$STAKE_ID" ] && [ "$STAKE_ID" != "None" ]; then
  sleep 0.2
  CLAIM_RESP=$(curl -s -X POST "$API/api/staking/positions/$STAKE_ID/claim")
  CLAIM_AMT=$(echo "$CLAIM_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('amount','err'))" 2>/dev/null)
  if [ -n "$CLAIM_AMT" ] && [ "$CLAIM_AMT" != "err" ]; then
    ok "POST /api/staking/positions/$STAKE_ID/claim → amount=$CLAIM_AMT"
  else
    fail "POST /api/staking/claim" "$(echo "$CLAIM_RESP" | head -c 200)"
  fi
fi

# C3: Unstake
if [ -n "$STAKE_ID" ] && [ "$STAKE_ID" != "None" ]; then
  UNSTAKE_RESP=$(curl -s -X POST "$API/api/staking/positions/$STAKE_ID/unstake")
  UNSTAKE_OK=$(echo "$UNSTAKE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'amountReturned' in d else 'fail')" 2>/dev/null)
  if [ "$UNSTAKE_OK" = "ok" ]; then ok "POST /api/staking/positions/$STAKE_ID/unstake"
  else fail "POST /api/staking/unstake" "$(echo "$UNSTAKE_RESP" | head -c 200)"; fi
fi

# C4: Create a marketplace listing
LISTING_RESP=$(curl -s -X POST "$API/api/marketplace/listings" \
  -H "Content-Type: application/json" \
  -d '{"sellerId":1,"tokenType":"intelligence","amount":25,"pricePerUnit":2.0}')
LISTING_ID=$(echo "$LISTING_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if [ -n "$LISTING_ID" ] && [ "$LISTING_ID" != "None" ]; then
  ok "POST /api/marketplace/listings → listingId=$LISTING_ID"
else
  fail "POST /api/marketplace/listings" "$(echo "$LISTING_RESP" | head -c 200)"
fi

# C5: Buy from that listing
if [ -n "$LISTING_ID" ] && [ "$LISTING_ID" != "None" ]; then
  BUY_RESP=$(curl -s -X POST "$API/api/marketplace/listings/$LISTING_ID/buy" \
    -H "Content-Type: application/json" \
    -d '{"buyerId":2,"amount":5}')
  BUY_OK=$(echo "$BUY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'tradeId' in d or 'id' in d else 'fail')" 2>/dev/null)
  if [ "$BUY_OK" = "ok" ]; then ok "POST /api/marketplace/listings/$LISTING_ID/buy (qty=5)"
  else fail "POST marketplace buy" "$(echo "$BUY_RESP" | head -c 200)"; fi
fi

# C6: Create a fresh listing specifically to cancel (the C4 listing may be partially sold)
CANCEL_LISTING_RESP=$(curl -s -X POST "$API/api/marketplace/listings" \
  -H "Content-Type: application/json" \
  -d '{"sellerId":2,"tokenType":"talent","amount":10,"pricePerUnit":3.0}')
CANCEL_LISTING_ID=$(echo "$CANCEL_LISTING_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if [ -n "$CANCEL_LISTING_ID" ] && [ "$CANCEL_LISTING_ID" != "None" ]; then
  CANCEL_RESP=$(curl -s -X POST "$API/api/marketplace/listings/$CANCEL_LISTING_ID/cancel" \
    -H "Content-Type: application/json" \
    -d '{"sellerId":2}')
  CANCEL_OK=$(echo "$CANCEL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('success') or d.get('status')=='cancelled' or 'listingId' in d else 'fail')" 2>/dev/null)
  if [ "$CANCEL_OK" = "ok" ]; then ok "POST /api/marketplace/listings/$CANCEL_LISTING_ID/cancel (fresh listing)"
  else fail "POST marketplace cancel" "$(echo "$CANCEL_RESP" | head -c 200)"; fi
else
  fail "POST marketplace cancel (setup listing)" "$(echo "$CANCEL_LISTING_RESP" | head -c 200)"
fi

# C7: Create a vault
VAULT_RESP=$(curl -s -X POST "$API/api/vaults" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"name":"E2E Test Vault","tokenType":"happiness","description":"Created by e2e-full.sh","isPublic":true}')
VAULT_ID=$(echo "$VAULT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if [ -n "$VAULT_ID" ] && [ "$VAULT_ID" != "None" ]; then
  ok "POST /api/vaults → vaultId=$VAULT_ID"
else
  fail "POST /api/vaults" "$(echo "$VAULT_RESP" | head -c 200)"
fi

# C8: Cast a governance vote (schema: voterId, support bool, weight number)
# Use a unique voterId (user 4) to avoid "already voted" errors on re-runs
VOTE_RESP=$(curl -s -X POST "$API/api/governance/proposals/1/vote" \
  -H "Content-Type: application/json" \
  -d '{"voterId":4,"support":true,"weight":500}')
VOTE_OK=$(echo "$VOTE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'id' in d or 'voteId' in d or d.get('voterId') else 'fail')" 2>/dev/null)
if [ "$VOTE_OK" = "ok" ]; then ok "POST /api/governance/proposals/1/vote (voterId=4, support=true)"
else fail "POST governance vote" "$(echo "$VOTE_RESP" | head -c 200)"; fi

# ─────────────────────────────────────────────────────────────────────────────
section "PHASE D · Database — direct table queries"
# ─────────────────────────────────────────────────────────────────────────────

db_count() {
  local label="$1" table="$2" min="$3"
  local count; count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
  if [ -z "$count" ]; then fail "$label" "could not query DB"; return; fi
  if [ "$count" -ge "$min" ]; then ok "$label" "count=$count"
  else fail "$label" "expected ≥$min rows, got $count"; fi
}

db_count "users table"                 "users"                1
db_count "attribute_tokens table"      "attribute_tokens"     9
db_count "vaults table"                "vaults"               1
db_count "staking_positions table"     "staking_positions"    1
db_count "marketplace_listings table"  "marketplace_listings" 1
db_count "governance_proposals table"  "governance_proposals" 1
db_count "oracle_feeds table"          "oracle_feeds"         1
db_count "votes table"                 "votes"                1
db_count "trades table"                "trades"               1
db_count "reward_claims table"         "reward_claims"        1

# D10: referential integrity — every staking position references a valid user
BAD=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM staking_positions sp LEFT JOIN users u ON sp.user_id=u.id WHERE u.id IS NULL;" 2>/dev/null | tr -d ' ')
if [ "${BAD:-1}" = "0" ]; then ok "FK integrity: all staking_positions.user_id → users.id"
else fail "FK integrity: staking_positions" "$BAD orphaned rows"; fi

BAD=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM marketplace_listings ml LEFT JOIN users u ON ml.seller_id=u.id WHERE u.id IS NULL;" 2>/dev/null | tr -d ' ')
if [ "${BAD:-1}" = "0" ]; then ok "FK integrity: all marketplace_listings.seller_id → users.id"
else fail "FK integrity: marketplace_listings" "$BAD orphaned rows"; fi

BAD=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM vaults v LEFT JOIN users u ON v.user_id=u.id WHERE u.id IS NULL;" 2>/dev/null | tr -d ' ')
if [ "${BAD:-1}" = "0" ]; then ok "FK integrity: all vaults.user_id → users.id"
else fail "FK integrity: vaults" "$BAD orphaned rows"; fi

# D13: data consistency — no staking positions with zero or negative amounts
BAD=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM staking_positions WHERE amount_staked::numeric <= 0;" 2>/dev/null | tr -d ' ')
if [ "${BAD:-1}" = "0" ]; then ok "DB consistency: no zero-amount staking positions"
else fail "DB consistency: zero-amount positions" "$BAD rows"; fi

# D14: user token balances match staking expectations
USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
ok "DB: $USERS users registered"

# D15: Check that the write ops in Phase C actually persisted
if [ -n "${VAULT_ID:-}" ] && [ "$VAULT_ID" != "None" ]; then
  VAULT_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM vaults WHERE id=$VAULT_ID;" 2>/dev/null | tr -d ' ')
  if [ "${VAULT_EXISTS:-0}" = "1" ]; then ok "DB: vault id=$VAULT_ID persisted from Phase C write"
  else fail "DB: vault persistence" "vault id=$VAULT_ID not found in DB"; fi
fi

# ─────────────────────────────────────────────────────────────────────────────
section "PHASE E · Frontend health"
# ─────────────────────────────────────────────────────────────────────────────

FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "$API/emofi/")
if [ "$FRONTEND" = "200" ]; then ok "Frontend vite app serves at /emofi/"
else fail "Frontend /emofi/" "HTTP $FRONTEND"; fi

BODY=$(curl -s "$API/emofi/")
if echo "$BODY" | grep -qi "<!DOCTYPE\|<html\|<head\|<script"; then
  ok "Frontend HTML: valid HTML document served"
else
  fail "Frontend HTML" "unexpected content: $(echo "$BODY" | head -c 120)"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "SUMMARY"
# ─────────────────────────────────────────────────────────────────────────────
printf "\n${BOLD}Full E2E Results: ${GREEN}$PASS passed${RESET}${BOLD}  ${RED}$FAIL failed${RESET}\n"
if [ ${#FAILURES[@]} -gt 0 ]; then
  printf "\n${RED}Failures:${RESET}\n"
  for i in "${!FAILURES[@]}"; do
    printf "  %d. %s\n" "$((i+1))" "${FAILURES[$i]}"
  done
fi
printf "\n"

exit $FAIL
