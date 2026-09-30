#!/usr/bin/env bash
# Manual integration tests for POST /api/v1/webhooks/website
# Run with: bash apps/api/src/modules/webhook/website.test-payloads.sh
#
# Prerequisites:
#   - API running on http://localhost:3001
#   - WEBSITE_WEBHOOK_SECRET=my_random_contact_secret  (matches .env.development)

BASE="http://localhost:3001/api/v1/webhooks/website"
TOKEN="my_random_contact_secret"
AUTH="Authorization: Bearer $TOKEN"

echo ""
echo "=== 1. Auth failures ==="

echo "--- 1a. Missing Authorization header (expect 401) ---"
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d '{"kind":"contact","values":{"name":"Test","phone":"9876543210"}}'
echo ""

echo "--- 1b. Wrong token (expect 401) ---"
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrongtoken" \
  -d '{"kind":"contact","values":{"name":"Test","phone":"9876543210"}}'
echo ""

echo "--- 1c. Missing Bearer prefix (expect 401) ---"
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"kind":"contact","values":{"name":"Test","phone":"9876543210"}}'
echo ""


echo ""
echo "=== 2. Invalid payloads (expect 400) ==="

echo "--- 2a. Missing 'kind' ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"values":{"name":"Test","phone":"9876543210"}}'
echo ""

echo "--- 2b. Unknown kind ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"kind":"unknown","values":{"name":"Test","phone":"9876543210"}}'
echo ""

echo "--- 2c. Missing name ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"kind":"contact","values":{"phone":"9876543210"}}'
echo ""

echo "--- 2d. Missing phone ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"kind":"contact","values":{"name":"Test User"}}'
echo ""

echo "--- 2e. Invalid email ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"kind":"contact","values":{"name":"Test","phone":"9876543210","email":"notanemail"}}'
echo ""


echo ""
echo "=== 3. Successful creation — all 7 form kinds (expect 200) ==="
# Note: use unique phone numbers each run or you will hit dedup on the second run.

echo "--- 3a. counselling ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "source": "website",
    "kind": "counselling",
    "page": "/admissions",
    "receivedAt": "2026-09-30T10:00:00Z",
    "values": {
      "name": "Arjun Sharma",
      "phone": "9800000001",
      "email": "arjun@example.com",
      "course": "NDA Coaching",
      "country": "India",
      "message": "Need guidance on NDA 2027"
    }
  }'
echo ""

echo "--- 3b. brochure ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "brochure",
    "page": "/courses",
    "values": {
      "name": "Priya Mehta",
      "phone": "9800000002",
      "email": "priya@example.com",
      "course": "CDS Coaching"
    }
  }'
echo ""

echo "--- 3c. eligibility ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "eligibility",
    "values": {
      "name": "Rahul Verma",
      "phone": "9800000003",
      "country": "India"
    }
  }'
echo ""

echo "--- 3d. demo ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "demo",
    "values": {
      "name": "Sneha Patel",
      "phone": "9800000004",
      "course": "AFCAT Coaching"
    }
  }'
echo ""

echo "--- 3e. callback ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "callback",
    "values": {
      "name": "Vikram Singh",
      "phone": "9800000005",
      "message": "Please call between 6-8 PM"
    }
  }'
echo ""

echo "--- 3f. roadmap ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "roadmap",
    "values": {
      "name": "Kavya Nair",
      "phone": "9800000006",
      "course": "CAPF Coaching",
      "country": "India"
    }
  }'
echo ""

echo "--- 3g. contact ---"
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "contact",
    "page": "/contact",
    "values": {
      "name": "Deepak Rao",
      "phone": "9800000007",
      "email": "deepak@example.com",
      "message": "General enquiry about courses"
    }
  }'
echo ""


echo ""
echo "=== 4. Duplicate phone (expect 200 with duplicate:true) ==="
echo "Sending Arjun Sharma (9800000001) a second time..."
curl -s -w "\n%{http_code}" -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "kind": "counselling",
    "values": {
      "name": "Arjun Sharma",
      "phone": "9800000001"
    }
  }'
echo ""

echo ""
echo "=== Done ==="
