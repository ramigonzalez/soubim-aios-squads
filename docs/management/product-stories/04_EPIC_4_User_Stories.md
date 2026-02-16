# Epic 4: Access Control & Administration - User Stories

**Epic ID:** E4
**Priority:** 🟠 HIGH (Security/MVP scope)
**Duration:** Weeks 5-7 (Parallel with E3)
**Team:** Backend API

---

## Story 4.1: User Management Database Schema

**User Story:**
> As a database engineer, I want to design a users and roles schema so that user authentication and access control can be implemented.

**Story Points:** 3
**Assigned to:** @dev (Database)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] `users` table created (id, email, password_hash, name, role)
- [ ] `roles` enum: director, architect, client
- [ ] Email unique constraint
- [ ] Password hashing ready (bcrypt)
- [ ] Audit fields: created_at, updated_at, last_login_at
- [ ] `user_projects` table (users linked to projects)

### Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,  -- director, architect
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE user_projects (
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  role_in_project VARCHAR(50),  -- lead, contributor
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_projects_user_id ON user_projects(user_id);
```

### Testing

- [ ] Schema creates successfully
- [ ] Constraints enforced
- [ ] Sample user inserted

---

## Story 4.2: JWT Authentication Endpoint

**User Story:**
> As a user, I want to log in with email/password and receive a JWT token so that I can access the API.

**Story Points:** 5
**Assigned to:** @dev (Backend API)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Endpoint: `POST /api/auth/login`
- [ ] Input: email, password
- [ ] Output: JWT token, user info
- [ ] Token stored in HTTP-only cookie
- [ ] Token expiration: 24 hours
- [ ] Password verified with bcrypt
- [ ] Invalid credentials: Generic error (no user enumeration)
- [ ] Rate limiting: 5 attempts/min per IP
- [ ] last_login_at updated

### Login Endpoint

```python
@app.post("/api/auth/login")
async def login(credentials: LoginRequest):
    """
    Login with email and password.

    Returns JWT token in HTTP-only cookie and user info in response.
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token(user.id, expires_in=86400)  # 24 hours
    user.last_login_at = datetime.utcnow()
    db.commit()

    response = JSONResponse({
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    })
    response.set_cookie(
        "access_token",
        token,
        max_age=86400,
        httponly=True,
        secure=True,
        samesite="strict"
    )
    return response
```

### Testing

- [ ] Unit test: Password verification
- [ ] Unit test: JWT token generation
- [ ] Integration test: Login flow
- [ ] Error test: Invalid credentials
- [ ] Rate limiting test: 5 attempts

---

## Story 4.3: JWT Middleware & Token Validation

**User Story:**
> As a backend engineer, I want JWT validation middleware so that all protected API endpoints verify the user is authenticated.

**Story Points:** 3
**Assigned to:** @dev (Backend API)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Middleware: Extract JWT from cookie/Authorization header
- [ ] Validate token signature and expiration
- [ ] Return 401 if invalid/expired
- [ ] Attach user info to request context
- [ ] Applied to all protected routes
- [ ] Public routes (login, health) exempt

### Middleware Implementation

```python
@app.middleware("http")
async def verify_jwt_middleware(request: Request, call_next):
    """Verify JWT token on all protected routes."""

    # Skip auth for public routes
    if request.url.path in ["/api/auth/login", "/health"]:
        return await call_next(request)

    # Extract token from cookie or header
    token = request.cookies.get("access_token") or \
            request.headers.get("Authorization", "").replace("Bearer ", "")

    if not token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        payload = decode_jwt_token(token)
        user = db.query(User).filter(User.id == payload["user_id"]).first()
        if not user:
            return JSONResponse({"error": "User not found"}, status_code=401)

        request.state.user = user
    except JWTError:
        return JSONResponse({"error": "Invalid token"}, status_code=401)

    return await call_next(request)
```

### Testing

- [ ] Unit test: Token validation
- [ ] Unit test: Expired token handling
- [ ] Integration test: Protected route access
- [ ] Integration test: Invalid token rejection

---

## Story 4.4: Role-Based Authorization

**User Story:**
> As a security engineer, I want role-based authorization so that users can only perform actions appropriate to their role.

**Story Points:** 5
**Assigned to:** @dev (Backend API)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Roles: director, architect, client
- [ ] Authorization decorator/middleware
- [ ] Role checking on protected endpoints
- [ ] Gabriela (director): Can view all projects, all decisions
- [ ] Architects: Can view assigned projects only
- [ ] Enforce authorization on all sensitive endpoints
- [ ] Return 403 (Forbidden) if unauthorized

### Authorization Decorator

```python
from functools import wraps

def require_role(*roles):
    """Decorator to check user role."""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = request.state.user
            if not user or user.role not in roles:
                raise HTTPException(status_code=403, detail="Forbidden")
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage
@app.get("/api/projects")
@require_role("director")  # Only directors can view all projects
async def list_all_projects(request: Request):
    return db.query(Project).all()
```

### Testing

- [ ] Unit test: Role checking
- [ ] Integration test: Director access
- [ ] Integration test: Architect access restrictions
- [ ] Integration test: 403 on unauthorized access

---

## Story 4.5: Project-Level Access Control

**User Story:**
> As a security engineer, I want to enforce project-level permissions so that architects can only access their assigned projects.

**Story Points:** 5
**Assigned to:** @dev (Backend API)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] `user_projects` table links users to projects
- [ ] Query: `SELECT projects WHERE user_id = X` (only assigned)
- [ ] Middleware check: Is user authorized for project_id?
- [ ] Gabriela (director): Always has access (no filtering)
- [ ] Architects: Filtered to assigned projects
- [ ] Return 403 if accessing unassigned project
- [ ] Decisions inherit project access

### Project Access Middleware

```python
def require_project_access(func):
    """Check if user has access to project."""
    @wraps(func)
    async def wrapper(request: Request, project_id: str, *args, **kwargs):
        user = request.state.user

        # Directors have access to all projects
        if user.role == "director":
            return await func(request, project_id, *args, **kwargs)

        # Others must be assigned
        access = db.query(UserProject).filter(
            UserProject.user_id == user.id,
            UserProject.project_id == project_id
        ).first()

        if not access:
            raise HTTPException(status_code=403, detail="Access denied")

        return await func(request, project_id, *args, **kwargs)
    return wrapper

# Usage
@app.get("/api/projects/{project_id}/decisions")
@require_project_access
async def list_decisions(request: Request, project_id: str):
    return db.query(Decision).filter(Decision.project_id == project_id).all()
```

### Testing

- [ ] Unit test: Access checking
- [ ] Integration test: Director access
- [ ] Integration test: Architect access (assigned)
- [ ] Integration test: Architect denied (unassigned)
- [ ] Integration test: Decision access inherited

---

## Story 4.6: Password Security & Hashing

**User Story:**
> As a security engineer, I want passwords hashed with bcrypt so that user credentials are secure.

**Story Points:** 3
**Assigned to:** @dev (Backend API)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] bcrypt hashing (cost=12)
- [ ] No plaintext passwords in database
- [ ] Password verification working
- [ ] Password strength validation (minimum 8 chars)
- [ ] User creation: Password hashed before storing

### Password Utilities

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain, hashed)

# On user creation
user.password_hash = hash_password(request.password)
db.add(user)
db.commit()
```

### Testing

- [ ] Unit test: Password hashing
- [ ] Unit test: Password verification
- [ ] Unit test: Hash uniqueness (same password produces different hashes)
- [ ] Database test: No plaintext passwords stored

---

## Story 4.7: Logout & Session Management

**User Story:**
> As a user, I want to log out and have my session cleared so that I'm not logged in on shared computers.

**Story Points:** 3
**Assigned to:** @dev (Backend API)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Endpoint: `POST /api/auth/logout`
- [ ] Clears access token cookie
- [ ] Returns 200 OK
- [ ] Token remains valid until expiration (can't be revoked mid-session)
- [ ] Session timeout: 24 hours (server-side)

### Logout Endpoint

```python
@app.post("/api/auth/logout")
async def logout(request: Request):
    """Log out user and clear session."""
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("access_token")
    return response
```

### Testing

- [ ] Unit test: Cookie clearing
- [ ] Integration test: Logout flow
- [ ] Integration test: Can't access protected routes after logout

---

## Story 4.8: CORS & Security Headers

**User Story:**
> As a security engineer, I want CORS configured and security headers set so that the API is protected from cross-origin attacks.

**Story Points:** 3
**Assigned to:** @dev (Backend API)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] CORS policy configured (allow frontend origin only)
- [ ] Security headers set:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Strict-Transport-Security: HTTPS only
- [ ] CSRF protection (SameSite=Strict on cookies)
- [ ] Rate limiting on sensitive endpoints (auth, API)
- [ ] No sensitive data in error messages

### CORS & Security Configuration

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],  # Only frontend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"]
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "example.com"])

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

### Testing

- [ ] CORS preflight test
- [ ] Security headers verification
- [ ] Cross-origin request rejection
- [ ] Rate limiting test

---

## Story 4.9: Rate Limiting

**User Story:**
> As an operator, I want rate limiting on sensitive endpoints so that brute-force attacks are mitigated.

**Story Points:** 3
**Assigned to:** @dev (Backend API)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Auth endpoints: 5 requests/min per IP
- [ ] General API: 100 requests/min per user
- [ ] Returns 429 (Too Many Requests) when limit exceeded
- [ ] Backoff handling (X-RateLimit-Retry-After header)

### Rate Limiting Implementation

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/auth/login")
@limiter.limit("5/minute")  # 5 requests per minute
async def login(request: Request, credentials: LoginRequest):
    # Login logic
```

### Testing

- [ ] Unit test: Limit calculation
- [ ] Integration test: Rate limit enforcement
- [ ] Integration test: 429 response

---

## Epic 4 Summary

**Total Stories:** 9
**Total Points:** 38
**Duration:** 3 weeks (Weeks 5-7, parallel with E3)
**Team:** Backend API (1 developer)

### Dependencies
- Independent (can start anytime)
- Needed before launch (security critical)
- Integrate with E1 backend (shared database)

### Deliverables
✅ User authentication (JWT)
✅ Role-based access control
✅ Project-level permissions
✅ Password security
✅ Session management
✅ CORS & security headers
✅ Rate limiting
✅ Secure & scalable access control system
