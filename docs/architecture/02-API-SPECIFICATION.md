# API Specification - DecisionLog

**Document ID:** architecture/api-specification
**Version:** 1.0
**Status:** Complete
**Owner:** @architect

---

## Overview

This document defines the complete REST API specification for DecisionLog backend, including:
- Authentication endpoints
- Project management endpoints
- Decision query endpoints
- Executive digest endpoints
- Webhook endpoints (Tactiq integration)

All endpoints use JSON for request/response. Authentication uses JWT bearer tokens.

**API Base URL:** `https://api.decisionlog.io/api`

---

## Authentication Endpoints

### POST /auth/login

Authenticate user and receive JWT token.

**Request:**

```json
{
  "email": "gabriela@soubim.com",
  "password": "secure_password"
}
```

**Response:** 200 OK

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "gabriela@soubim.com",
    "name": "Gabriela",
    "role": "director"
  }
}
```

**Error:** 401 Unauthorized

```json
{
  "error": "authentication_failed",
  "detail": "Invalid email or password"
}
```

---

### GET /auth/me

Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:** 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "gabriela@soubim.com",
  "name": "Gabriela",
  "role": "director",
  "projects": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

---

### POST /auth/logout

Invalidate current session (optional for JWT, mainly for security).

**Headers:** `Authorization: Bearer <token>`

**Response:** 204 No Content

---

## Project Endpoints

### GET /projects

List all projects accessible to current user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (default: 50): Number of results
- `offset` (default: 0): Pagination offset
- `archived` (optional): Filter by archived status (true/false)

**Response:** 200 OK

```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Residential Tower Alpha",
      "description": "50-floor residential tower in downtown",
      "created_at": "2026-01-15T10:00:00Z",
      "member_count": 8,
      "decision_count": 127,
      "latest_decision": "2026-02-07T14:30:00Z"
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

---

### GET /projects/{project_id}

Get detailed information about a specific project.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `project_id`: Project UUID

**Response:** 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Residential Tower Alpha",
  "description": "50-floor residential tower in downtown",
  "created_at": "2026-01-15T10:00:00Z",
  "archived_at": null,
  "members": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440100",
      "name": "Gabriela",
      "email": "gabriela@soubim.com",
      "role": "owner"
    }
  ],
  "stats": {
    "total_decisions": 127,
    "decisions_last_week": 12,
    "decisions_by_discipline": {
      "architecture": 45,
      "mep": 32,
      "landscape": 18,
      "structural": 16,
      "electrical": 10,
      "plumbing": 6
    },
    "decisions_by_meeting_type": {
      "client": 52,
      "multi-disciplinary": 61,
      "internal": 14
    }
  }
}
```

---

## Decision Endpoints

### GET /projects/{project_id}/decisions

Query decisions with advanced filtering.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `project_id`: Project UUID

**Query Parameters:**
- `discipline` (optional): Filter by discipline (architecture, mep, landscape, structural, electrical, plumbing, general)
- `meeting_type` (optional): Filter by meeting type (client, multi-disciplinary, internal)
- `date_from` (optional): ISO 8601 date (e.g., 2026-01-01)
- `date_to` (optional): ISO 8601 date
- `confidence_min` (optional): Minimum confidence 0.0-1.0
- `has_anomalies` (optional): Filter by anomalies (true/false)
- `search` (optional): Free-text search in statement and why fields
- `limit` (default: 50): Results per page
- `offset` (default: 0): Pagination offset
- `sort_by` (default: created_at): Sort field (created_at, confidence, timestamp)
- `sort_order` (default: desc): Sort order (asc, desc)

**Response:** 200 OK

```json
{
  "decisions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "decision_statement": "Changed structural material from concrete to steel",
      "who": "Carlos (Structural Engineer)",
      "timestamp": "00:23:15",
      "discipline": "structural",
      "meeting_type": "multi-disciplinary",
      "meeting_date": "2026-02-01T14:00:00Z",
      "why": "Client requested lighter structure for seismic performance",
      "causation": "Client requirement",
      "consensus": {
        "architecture": "AGREE",
        "mep": "AGREE",
        "structural": "AGREE"
      },
      "impacts": [
        {
          "type": "timeline",
          "change": "+2 weeks for steel delivery"
        },
        {
          "type": "budget",
          "change": "+$50K for steel vs concrete"
        }
      ],
      "confidence": 0.92,
      "anomaly_flags": [],
      "created_at": "2026-02-01T14:45:00Z"
    }
  ],
  "total": 127,
  "limit": 50,
  "offset": 0,
  "facets": {
    "disciplines": {
      "architecture": 45,
      "mep": 32
    },
    "meeting_types": {
      "client": 52,
      "multi-disciplinary": 61
    }
  }
}
```

---

### GET /decisions/{decision_id}

Get complete details for a single decision including transcript excerpt.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `decision_id`: Decision UUID

**Response:** 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440200",
  "decision_statement": "Changed structural material from concrete to steel",
  "who": "Carlos (Structural Engineer)",
  "timestamp": "00:23:15",
  "discipline": "structural",
  "why": "Full context reasoning about why this decision was made. Client requested lighter structure for seismic performance. Engineers evaluated options...",
  "causation": "Client requirement for improved seismic performance",
  "impacts": [
    {"type": "timeline", "change": "+2 weeks"},
    {"type": "budget", "change": "+$50K"}
  ],
  "consensus": {
    "architecture": "AGREE",
    "mep": "AGREE",
    "structural": "AGREE"
  },
  "confidence": 0.92,
  "similar_decisions": [
    {
      "decision_id": "550e8400-e29b-41d4-a716-446655440201",
      "similarity_score": 0.87,
      "decision_statement": "Previous evaluation of steel vs concrete trade-off"
    }
  ],
  "consistency_notes": "Aligns with previous material choices. No contradictions detected.",
  "anomaly_flags": [],
  "transcript_excerpt": {
    "text": "CARLOS: ...the client specifically requested a lighter structure to improve seismic performance. We've evaluated concrete vs steel...[TRANSCRIPT EXCERPT 5-10 MINUTES AROUND DECISION]...",
    "start": "00:18:15",
    "end": "00:28:15"
  },
  "meeting": {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "type": "multi-disciplinary",
    "date": "2026-02-01T14:00:00Z",
    "duration_minutes": 120,
    "participants": [
      {"name": "Gabriela", "email": "gabriela@soubim.com", "role": "director"},
      {"name": "Carlos", "email": "carlos@soubim.com", "role": "structural_engineer"}
    ]
  },
  "created_at": "2026-02-01T14:45:00Z",
  "updated_at": "2026-02-01T14:45:00Z"
}
```

**Error:** 404 Not Found

```json
{
  "error": "resource_not_found",
  "detail": "Decision with id 'xxx' not found"
}
```

---

### PATCH /decisions/{decision_id}

Update decision (approval, notes).

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `decision_id`: Decision UUID

**Request:**

```json
{
  "approved": true,
  "notes": "Approved - aligns with project vision"
}
```

**Response:** 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440200",
  "decision_statement": "Changed structural material from concrete to steel",
  "approved": true,
  "approved_by": "gabriela@soubim.com",
  "approved_at": "2026-02-05T10:00:00Z",
  "approval_notes": "Approved - aligns with project vision"
}
```

---

## Digest Endpoints

### GET /projects/{project_id}/digest

Get Gabriela's executive digest for a project during a time period.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `project_id`: Project UUID

**Query Parameters:**
- `date_from` (required): ISO 8601 date (e.g., 2026-01-01)
- `date_to` (required): ISO 8601 date

**Response:** 200 OK

```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Residential Tower Alpha"
  },
  "period": {
    "from": "2026-01-01",
    "to": "2026-02-07"
  },
  "summary": {
    "total_decisions": 42,
    "by_discipline": {
      "architecture": 15,
      "mep": 12,
      "landscape": 8,
      "structural": 7
    },
    "high_impact_decisions": 5,
    "decisions_with_dissent": 2
  },
  "highlights": [
    {
      "type": "structural_change",
      "count": 3,
      "title": "Structural Changes",
      "description": "3 structural material changes decided",
      "decision_ids": [
        "550e8400-e29b-41d4-a716-446655440201",
        "550e8400-e29b-41d4-a716-446655440202",
        "550e8400-e29b-41d4-a716-446655440203"
      ]
    },
    {
      "type": "timeline_impact",
      "count": 1,
      "title": "Timeline Impact",
      "description": "MEP scope change adds 2 weeks to project",
      "decision_ids": ["550e8400-e29b-41d4-a716-446655440204"]
    },
    {
      "type": "budget_impact",
      "count": 2,
      "title": "Budget Changes",
      "description": "Two decisions affecting project budget",
      "decision_ids": [
        "550e8400-e29b-41d4-a716-446655440205",
        "550e8400-e29b-41d4-a716-446655440206"
      ]
    }
  ],
  "anomalies": [
    {
      "decision_id": "550e8400-e29b-41d4-a716-446655440207",
      "flag": "high_dissent",
      "severity": "medium",
      "description": "MEP team disagreed with architecture decision on HVAC placement"
    },
    {
      "decision_id": "550e8400-e29b-41d4-a716-446655440208",
      "flag": "reversal_pattern",
      "severity": "high",
      "description": "Contradicts previous decision on material choice made 3 days ago"
    }
  ]
}
```

---

## Webhook Endpoints

### POST /webhooks/transcript

Receive transcripts from Tactiq webhook.

**Headers:**
- `X-Tactiq-Signature: sha256=<HMAC signature>`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "webhook_id": "tactiq_123456789",
  "meeting_id": "google_meet_abcdefghijk",
  "project_id": "550e8400-e29b-41d4-a716-446655440001",
  "meeting_type": "multi-disciplinary",
  "participants": [
    {
      "name": "Gabriela",
      "email": "gabriela@soubim.com",
      "role": "director"
    },
    {
      "name": "Carlos",
      "email": "carlos@soubim.com",
      "role": "structural_engineer"
    }
  ],
  "transcript": "GABRIELA: Good morning everyone... [FULL MEETING TRANSCRIPT TEXT]... CARLOS: Sounds good, let's implement this.",
  "duration_minutes": 120,
  "meeting_date": "2026-02-01T14:00:00Z"
}
```

**Response:** 202 Accepted

```json
{
  "status": "queued",
  "transcript_id": "550e8400-e29b-41d4-a716-446655440400",
  "message": "Transcript received, extraction queued for processing"
}
```

**Error:** 401 Unauthorized

```json
{
  "error": "invalid_signature",
  "detail": "Webhook signature verification failed"
}
```

**Error:** 400 Bad Request

```json
{
  "error": "validation_error",
  "detail": "Missing required field: transcript"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "error_type",
  "detail": "Human-readable error message",
  "request_id": "req_1234567890abcdef"
}
```

### Common Error Codes

| Status | Error Type | Meaning |
|--------|-----------|---------|
| 400 | validation_error | Request validation failed |
| 401 | authentication_failed | Invalid or missing credentials |
| 403 | permission_denied | User lacks required permissions |
| 404 | resource_not_found | Requested resource not found |
| 429 | rate_limit_exceeded | Too many requests |
| 500 | internal_error | Server error |

---

## Rate Limiting

All authenticated endpoints support rate limiting:

- **Standard limit:** 100 requests per minute per user
- **Headers returned:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 87`
  - `X-RateLimit-Reset: 1612949660`

When rate limited:

```json
{
  "error": "rate_limit_exceeded",
  "detail": "Too many requests. Limit reset at 2026-02-07T14:45:00Z"
}
```

---

## Pagination

List endpoints support cursor-based pagination:

```
GET /projects?limit=50&offset=0
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "total": 127,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

---

## OpenAPI Specification

For detailed OpenAPI 3.0 specification, see `openapi.yaml` in the backend repository root.

Generate interactive API documentation:

```bash
cd decision-log-backend
# Using FastAPI
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# Visit http://localhost:8000/docs for Swagger UI
```

---

**Document Status:** Complete
**Last Updated:** 2026-02-07
**Next:** Database Schema Specification

— Aria, arquitetando o futuro 🏗️
