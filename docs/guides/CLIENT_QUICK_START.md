# DecisionLog — Client Quick Start Guide

> **Version:** 1.0
> **Last Updated:** 2026-03-06
> **Audience:** New clients onboarding to DecisionLog

---

## What is DecisionLog?

DecisionLog is a decision-tracking platform for architectural and engineering projects. It captures decisions from meetings, emails, and documents — then organizes them by project, discipline, and timeline so your team never loses track of what was decided, by whom, and why.

**Key capabilities:**
- Track decisions, action items, ideas, topics, and information across projects
- Organize by discipline (structural, MEP, architecture, landscape, etc.)
- Ingest meeting transcripts (Fireflies/Tactiq), emails (Gmail), and documents (Google Drive)
- AI-powered extraction of decisions from raw content
- Timeline view with filtering and drill-down
- Role-based access (Director, Architect, Client)
- Shareable read-only links for stakeholders

---

## Current Onboarding Process

> **Important:** DecisionLog currently operates as an **admin-provisioned** system. Account creation is handled by the DecisionLog admin team — there is no self-service signup yet.

### Step 1: Request Access

Contact your DecisionLog administrator to request an account. Provide:

- **Full name**
- **Email address** (will be your login)
- **Role** — one of:
  - `director` — Full access to all projects, can approve/reject sources, manage members
  - `architect` — Access to assigned projects, can edit project metadata
  - `client` — Read-only access to assigned projects

The admin will create your account and assign you to the relevant project(s).

### Step 2: Receive Credentials

You will receive:
- **Application URL** (e.g., `https://your-instance.example.com`)
- **Email** (your login)
- **Temporary password**

> **Note:** There is no password reset flow yet. If you lose access, contact the admin to reset your password manually.

### Step 3: Log In

1. Navigate to the application URL
2. Enter your **email** and **password**
3. Click **Log In**
4. You'll be redirected to the **Projects** page

### Step 4: Explore Your Projects

After login, you'll see the projects you've been assigned to. Each project contains:

- **Timeline** — Chronological view of all decisions, grouped by meeting/source
- **Filters** — Filter by discipline, item type, date range, search text
- **Decision Details** — Click any item to see full context: who decided, why, impacts, related items
- **Sources** — Meeting transcripts, emails, and documents linked to decisions

### Step 5: Understanding Item Types

DecisionLog tracks 5 types of items:

| Type | Description | Example |
|------|-------------|---------|
| **Decision** | A confirmed choice or resolution | "Use steel structure for floors 10-15" |
| **Action Item** | A task assigned to someone | "Carlos to deliver structural calcs by Friday" |
| **Idea** | A proposal not yet decided | "Consider green roof for sustainability credits" |
| **Topic** | A discussion point or agenda item | "MEP coordination for parking levels" |
| **Information** | Reference data or context | "Building code requires 2h fire rating" |

### Step 6: Understanding Disciplines

Items are categorized by architectural/engineering discipline:

Architecture, Structural, MEP (Mechanical/Electrical/Plumbing), Electrical, Plumbing, HVAC, Landscape, Interior Design, Sustainability, Fire Safety, Acoustics, Lighting, Civil, Geotechnical, General

---

## Roles & Permissions

| Action | Director | Architect | Client |
|--------|----------|-----------|--------|
| View all projects | Yes | No | No |
| View assigned projects | Yes | Yes | Yes |
| View decisions & timeline | Yes | Yes | Yes |
| Approve/reject sources | Yes | No | No |
| Edit project metadata | Yes | Yes | No |
| Manage project members | Yes | No | No |
| Create shared links | Yes | Yes | No |

---

## For Administrators: Setting Up a New Client

This section is for the admin provisioning new users and projects.

### Prerequisites

- Access to the DecisionLog backend (API or database)
- Backend server running with a configured database

### Option A: Using the API (Recommended)

There is **no admin API endpoint** for user creation yet. See Option B.

### Option B: Direct Database Insertion

Connect to the PostgreSQL database and run:

```sql
-- 1. Create the user
INSERT INTO users (id, email, password_hash, name, role, created_at)
VALUES (
  gen_random_uuid(),
  'newclient@company.com',
  -- Generate hash with: python3 -c "import bcrypt; print(bcrypt.hashpw(b'temporary-password', bcrypt.gensalt(rounds=12)).decode())"
  '$2b$12$<generated-hash-here>',
  'Client Name',
  'architect',  -- or 'director' or 'client'
  NOW()
);

-- 2. Get the user ID
SELECT id FROM users WHERE email = 'newclient@company.com';

-- 3. Assign to a project
INSERT INTO project_members (project_id, user_id, role, created_at)
VALUES (
  '<project-uuid>',
  '<user-uuid-from-step-2>',
  'architect',  -- project-level role
  NOW()
);
```

### Option C: Using a Python Script

```python
# Run from the decision-log-backend directory with venv activated
from app.database.session import SessionLocal
from app.database.models import User, ProjectMember
from app.utils.security import hash_password
import uuid

db = SessionLocal()

# Create user
user = User(
    id=str(uuid.uuid4()),
    email="newclient@company.com",
    password_hash=hash_password("temporary-password"),
    name="Client Name",
    role="architect"
)
db.add(user)
db.flush()

# Assign to project
member = ProjectMember(
    project_id="<project-uuid>",
    user_id=user.id,
    role="architect"
)
db.add(member)
db.commit()
db.close()

print(f"User created: {user.email} (ID: {user.id})")
```

### Creating a New Project

```sql
INSERT INTO projects (id, name, description, project_type, created_at)
VALUES (
  gen_random_uuid(),
  'Project Name',
  'Project description',
  'residential',  -- or 'commercial', 'mixed_use', 'institutional', etc.
  NOW()
);
```

---

## Integrations Setup (Optional)

### Meeting Transcripts (Fireflies/Tactiq)

To auto-ingest meeting transcripts:

1. Configure a webhook in Fireflies/Tactiq pointing to:
   `POST https://your-instance.example.com/api/webhooks/tactiq`
2. Set the `TACTIQ_WEBHOOK_SECRET` env variable on the backend to match the webhook secret
3. Meeting transcripts will auto-create Sources and extract decisions via AI

### Gmail Integration

To monitor a project inbox:

1. Create a Google Cloud service account with Gmail API access
2. Set `GMAIL_CREDENTIALS_JSON` env variable with the service account JSON
3. Set `GMAIL_POLL_INTERVAL_MINUTES` (default: 15)
4. Emails will be ingested as Sources

### Google Drive Monitoring

To watch a project's Drive folder:

1. Create a Google Cloud service account with Drive API read access
2. Set `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY` and `GOOGLE_DRIVE_ENABLED=true`
3. Link Drive folders to projects via the `drive_folder_id` field
4. Documents will be auto-ingested as Sources

---

## FAQ

**Q: Can I sign up on my own?**
A: Not yet. Account creation is admin-managed. Contact your administrator.

**Q: How do I reset my password?**
A: Contact your administrator. Self-service password reset is not available yet.

**Q: Can I invite team members?**
A: Directors can request the admin to add members. There is no self-service invite flow yet.

**Q: How long does my login session last?**
A: 7 days. After that, you'll need to log in again.

**Q: Can I share a project view with someone who doesn't have an account?**
A: Yes — Directors and Architects can create **shared links** that provide read-only access without authentication.

**Q: What browsers are supported?**
A: Any modern browser (Chrome, Firefox, Safari, Edge). Mobile-responsive design included.

---

## What's Not Yet Available (SaaS Roadmap)

The following features would be needed for full SaaS self-service:

| Feature | Status | Description |
|---------|--------|-------------|
| Self-service signup | Not built | Registration form + email verification |
| Password reset | Not built | Forgot password email flow |
| Multi-tenancy | Not built | Organization-level data isolation |
| Admin dashboard | Not built | UI for managing users, projects, billing |
| Invite flow | Not built | Email invitations with signup links |
| SSO/OAuth | Not built | Google, Microsoft, SAML login |
| Billing & plans | Not built | Subscription tiers, usage metering |
| Onboarding wizard | Not built | Guided first-time setup in the app |

---

## Support

For issues or questions:
- Contact your DecisionLog administrator
- Report bugs to the development team

---

*DecisionLog Quick Start Guide v1.0*
