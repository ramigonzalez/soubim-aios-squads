# Database Setup Guide

Complete guide for setting up DecisionLog database locally.

## Quick Start (5 minutes)

```bash
# 1. Start PostgreSQL with docker-compose
cd decision-log-backend
docker-compose up -d

# 2. Verify PostgreSQL is running
docker-compose ps

# 3. Install Python dependencies (if not done)
pip install -r requirements.txt

# 4. Run Alembic migration
alembic upgrade head

# 5. Seed initial data
python app/database/seed.py

# 6. Run tests to verify
pytest tests/unit/test_database.py -v
```

## Detailed Setup

### Step 1: Start PostgreSQL

The `docker-compose.yml` includes PostgreSQL with pgvector pre-installed.

```bash
cd decision-log-backend
docker-compose up -d
```

Verify it's running:
```bash
docker-compose ps

# Should show:
# decision-log-backend-db-1    pgvector/pgvector:pg15-latest    Up    0.0.0.0:5432->5432/tcp
```

Check database connection:
```bash
docker-compose exec db psql -U postgres -c "SELECT 1"
# Output: 1
```

### Step 2: Verify Environment

Create `.env` file from template:
```bash
cp .env.example .env
```

Must include:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/decisionlog
```

### Step 3: Run Migrations

Create schema:
```bash
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl with target metadata
INFO  [alembic.runtime.migration] Will assume transactional DDL is supported
INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial, Initial database schema with 7 tables and pgvector
```

Verify migration was successful:
```bash
alembic current
# Output: 001_initial
```

### Step 4: Seed Test Data

Add initial data for development:
```bash
python app/database/seed.py
```

Expected output:
```
🌱 Seeding database...
  ✓ Created user: test@example.com
  ✓ Created user: gabriela@soubim.com
  ✓ Created user: carlos@mep.com
  ✓ Created project: Residential Tower Alpha
  ✓ Created project: Commercial Plaza Beta
  ✓ Created project memberships
✅ Database seeded successfully!
```

### Step 5: Verify Schema

Connect to database and check tables:
```bash
docker-compose exec db psql -U postgres -d decisionlog -c "\dt"

# Output should show 7 tables:
#  Schema | Name                      | Type  | Owner
# --------+---------------------------+-------+----------
#  public | decision_relationships    | table | postgres
#  public | decisions                 | table | postgres
#  public | project_members           | table | postgres
#  public | projects                  | table | postgres
#  public | transcripts               | table | postgres
#  public | users                     | table | postgres
#  public | alembic_version           | table | postgres
```

Check pgvector extension:
```bash
docker-compose exec db psql -U postgres -d decisionlog -c "SELECT extname FROM pg_extension WHERE extname = 'vector'"

# Output:
#  extname
# ---------
#  vector
```

List indexes:
```bash
docker-compose exec db psql -U postgres -d decisionlog -c "\di"
```

### Step 6: Run Tests

Execute database unit tests:
```bash
pytest tests/unit/test_database.py -v

# Output:
# tests/unit/test_database.py::TestUserTable::test_user_table_exists PASSED
# tests/unit/test_database.py::TestUserTable::test_user_required_columns PASSED
# ...
# ============ 40 passed in 2.34s ============
```

Run with coverage:
```bash
pytest tests/unit/test_database.py --cov=app.database --cov-report=term-missing

# Shows coverage percentage
```

## Database Operations

### View Data

```bash
# List users
docker-compose exec db psql -U postgres -d decisionlog -c "SELECT id, email, name, role FROM users"

# List projects
docker-compose exec db psql -U postgres -d decisionlog -c "SELECT id, name FROM projects"

# Count decisions
docker-compose exec db psql -U postgres -d decisionlog -c "SELECT COUNT(*) FROM decisions"
```

### Reset Database

Drop all tables and start fresh:
```bash
# Downgrade migrations
alembic downgrade base

# Upgrade again
alembic upgrade head

# Re-seed data
python app/database/seed.py
```

### Stop PostgreSQL

```bash
docker-compose down
```

Remove data and start fresh:
```bash
docker-compose down -v
```

## Troubleshooting

### Migration Fails: "Extension 'vector' doesn't exist"

**Solution:** Ensure PostgreSQL image has pgvector installed. Use:
```yaml
# In docker-compose.yml
image: pgvector/pgvector:pg15-latest
```

### Connection Refused

**Solution:** Check PostgreSQL is running:
```bash
docker-compose ps
docker-compose logs db
```

### Seed Script Fails: "No module named app"

**Solution:** Make sure you're running from project root:
```bash
cd decision-log-backend
python app/database/seed.py
```

### Tests Fail: "No module named app"

**Solution:** Install package in development mode:
```bash
pip install -e .
```

Or ensure PYTHONPATH includes project:
```bash
PYTHONPATH=/path/to/decision-log-backend pytest tests/
```

## Development Workflow

1. **Make schema changes:**
   ```bash
   # Modify app/database/models.py
   # Create new migration
   alembic revision --autogenerate -m "Add new column to users"
   # Review generated migration in alembic/versions/
   alembic upgrade head
   ```

2. **Test changes:**
   ```bash
   pytest tests/unit/test_database.py -v
   ```

3. **Seed fresh data:**
   ```bash
   alembic downgrade base
   alembic upgrade head
   python app/database/seed.py
   ```

## Production Deployment

For Supabase (managed PostgreSQL):

1. Get connection string from Supabase dashboard
2. Set in production `.env`:
   ```
   DATABASE_URL=postgresql://user:password@db.project.supabase.co:5432/postgres
   ```
3. Run migrations:
   ```bash
   alembic upgrade head
   ```
4. Seed production data (with actual users, not test data)

## Performance

Check query performance:
```bash
docker-compose exec db psql -U postgres -d decisionlog << EOF
EXPLAIN ANALYZE SELECT * FROM decisions WHERE project_id = '...' AND discipline = 'architecture';
EOF
```

Monitor index usage:
```bash
docker-compose exec db psql -U postgres -d decisionlog -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname='public'"
```

## References

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated:** 2026-02-07
**Status:** Complete and tested
