# DecisionLog Backend

FastAPI backend for DecisionLog - AI-Powered Architectural Decision System.

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 15
- PostgreSQL pgvector extension

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### Database Setup

```bash
# Create initial migration
alembic init

# Run migrations
alembic upgrade head

# Verify tables were created
```

### Running the Server

```bash
# Development mode
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Access API documentation at: http://localhost:8000/docs

## Project Structure

```
app/
├── main.py              # FastAPI app initialization
├── config.py            # Settings configuration
├── api/
│   ├── routes/          # API endpoints
│   │   ├── auth.py      # Authentication
│   │   ├── projects.py  # Projects
│   │   ├── decisions.py # Decisions
│   │   ├── digest.py    # Executive digest
│   │   └── webhooks.py  # Tactiq webhooks
│   ├── models/          # Request/response schemas
│   └── middleware/      # Custom middleware
├── database/
│   ├── models.py        # SQLAlchemy ORM
│   ├── session.py       # Connection pooling
│   └── crud.py          # CRUD operations
├── services/            # Business logic
├── extraction/          # LangGraph agent pipeline
└── utils/               # Utilities (security, logging)
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/unit/test_auth.py
```

## Development

### Linting
```bash
ruff check app tests
black app tests
```

### Type Checking
```bash
mypy app
```

## Environment Variables

See `.env.example` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Secret key for JWT tokens
- `ANTHROPIC_API_KEY` - Anthropic API key
- `TACTIQ_WEBHOOK_SECRET` - Webhook signature secret
- `SENTRY_DSN` - Sentry error tracking

## API Documentation

Full API specification available at: `/docs/architecture/02-API-SPECIFICATION.md`

Endpoints:
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Current user info
- `GET /api/projects` - List projects
- `GET /api/projects/{project_id}` - Project detail
- `GET /api/projects/{project_id}/decisions` - List decisions with filters
- `GET /api/decisions/{decision_id}` - Decision detail
- `GET /api/projects/{project_id}/digest` - Executive digest
- `POST /api/webhooks/transcript` - Tactiq webhook receiver

## Deployment

See `/docs/architecture/06-DEPLOYMENT.md` for deployment instructions.

Supported platforms:
- Railway
- Render
- AWS (via Alembic migrations)
- Azure (via Alembic migrations)

## Contributing

Follow FastAPI best practices and add tests for new features.
