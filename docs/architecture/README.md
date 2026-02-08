# DecisionLog Architecture Documentation

**Project:** DecisionLog - AI-Powered Architectural Decision System
**Owner:** @architect (Aria) with full team collaboration
**Status:** ✅ Complete and Ready for Implementation
**Last Updated:** 2026-02-07

---

## 📚 Documentation Index

This directory contains the complete technical architecture for DecisionLog, a decision-centric documentation system that captures architectural decisions from Google Meet transcripts and surfaces them through an intelligent timeline dashboard.

### Core Architecture Documents

1. **[01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md)** - HIGH-LEVEL ARCHITECTURE
   - System architecture diagram with data flows
   - Repository strategy (two repos: backend + frontend)
   - Technology stack overview
   - Data flow pipeline (capture → extract → query → display)
   - Budget analysis and timeline

2. **[02-API-SPECIFICATION.md](./02-API-SPECIFICATION.md)** - REST API DESIGN
   - Complete endpoint specifications
   - Authentication endpoints (login, logout, me)
   - Project management endpoints (list, detail)
   - Decision query endpoints (with filters, drill-down)
   - Executive digest endpoint (for Gabriela)
   - Webhook endpoint (Tactiq integration)
   - Error response formats
   - Rate limiting and pagination

3. **[03-DATABASE-SCHEMA.md](./03-DATABASE-SCHEMA.md)** - DATA MODEL
   - PostgreSQL schema with 7 tables
   - pgvector integration for semantic search
   - Indexes for performance optimization
   - Data relationships and foreign keys
   - Soft delete implementation
   - Migration strategy (Alembic)
   - Backup and recovery procedures
   - Performance tuning

4. **[04-AGENT-PIPELINE.md](./04-AGENT-PIPELINE.md)** - AI EXTRACTION SYSTEM
   - LangGraph workflow for decision extraction
   - Claude 3.5 Sonnet integration
   - 5 enrichment tools (retrieve, validate, confidence, anomalies)
   - sentence-transformers for embeddings (local, free)
   - APScheduler for async processing
   - Cost breakdown (~$0.40 per meeting)
   - Performance analysis and monitoring
   - Testing strategy

5. **[05-FRONTEND-ARCHITECTURE.md](./05-FRONTEND-ARCHITECTURE.md)** - USER INTERFACE
   - React 18 + TypeScript component hierarchy
   - Page structure and routes (login, projects, detail)
   - Detailed component specs (Timeline, DecisionCard, DrillDownModal)
   - State management (React Query + Zustand)
   - API service layer
   - Performance optimization (code splitting, virtualization)
   - Testing strategy

6. **[06-DEPLOYMENT.md](./06-DEPLOYMENT.md)** - INFRASTRUCTURE & CI/CD
   - Infrastructure topology (Railway/Render, Vercel, Supabase)
   - GitHub Actions CI/CD pipelines
   - Environment variable configuration
   - Health checks and monitoring
   - Disaster recovery procedures
   - Rollback strategy
   - Cost breakdown ($18-31/month)

7. **[07-SECURITY.md](./07-SECURITY.md)** - SECURITY & COMPLIANCE
   - JWT authentication flow
   - Role-based access control (RBAC)
   - Data protection (HTTPS, bcrypt, encryption)
   - OWASP Top 10 mitigation
   - Webhook signature verification
   - Rate limiting implementation
   - Incident response procedures
   - Security testing and checklist

---

## 🎯 Quick Start for Development Teams

### For Backend (@dev)
→ Start with: **[04-AGENT-PIPELINE.md](./04-AGENT-PIPELINE.md)** + **[03-DATABASE-SCHEMA.md](./03-DATABASE-SCHEMA.md)**
- PostgreSQL schema is the foundation
- LangGraph agent pipeline handles all decision extraction
- FastAPI routes in [02-API-SPECIFICATION.md](./02-API-SPECIFICATION.md) are the contracts

### For Frontend (@ux-design-expert, @dev)
→ Start with: **[05-FRONTEND-ARCHITECTURE.md](./05-FRONTEND-ARCHITECTURE.md)**
- Component structure is clearly defined
- State management patterns (React Query + Zustand)
- API contracts from [02-API-SPECIFICATION.md](./02-API-SPECIFICATION.md)

### For DevOps (@devops)
→ Start with: **[06-DEPLOYMENT.md](./06-DEPLOYMENT.md)** + **[07-SECURITY.md](./07-SECURITY.md)**
- Infrastructure setup on Railway/Render/Vercel/Supabase
- GitHub Actions pipelines
- Monitoring and incident response

---

## 📊 Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                     │
│  React + Timeline + Filters + Drill-Down Modal           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS REST API
┌────────────────────▼────────────────────────────────────┐
│              BACKEND (Railway/Render)                    │
│  FastAPI Routes: /auth, /projects, /decisions, /webhooks │
│  • Authentication (JWT)                                  │
│  • Project queries & filtering                           │
│  • Decision drill-down                                   │
│  • Tactiq webhook receiver                               │
└────────────────┬─────────────┬──────────────────────────┘
                 │ SQLAlchemy  │ APScheduler Queue
                 │             │
┌────────────────▼─┐    ┌──────▼─────────────────────────┐
│ DATABASE         │    │ EXTRACTION PIPELINE             │
│ (Supabase)       │    │ • Claude extraction             │
│                  │    │ • 5 enrichment tools            │
│ • users          │    │ • Vector embeddings             │
│ • projects       │    │ • Storage                       │
│ • decisions      │◄───┤                                 │
│ • transcripts    │    │ Cost: ~$0.40/meeting            │
│ • pgvector       │    │ Latency: 2-3 min total          │
└──────────────────┘    └─────────────────────────────────┘
```

---

## 🔑 Key Metrics & Success Criteria

### Performance
- Dashboard load: <2 seconds
- API latency (p95): <200ms
- Vector search: <100ms
- Total extraction latency: 2-3 minutes

### Cost
- Claude API: ~$5.60/month (40 meetings × $0.14)
- Backend (Railway): $10-20/month
- Database (Supabase): Free tier
- Frontend (Vercel): Free
- **TOTAL: $18-31/month** ✅ Within budget

### Coverage
- 40 decisions per meeting (typical)
- 40 meetings per month (2/day × 20 days)
- ~1,600 decisions per month
- 95%+ extraction accuracy target

### Reliability
- 99%+ uptime (managed services)
- Auto-backup: Daily snapshots, 7-day retention
- Auto-restart: Railway health checks every 30s
- Error tracking: Sentry monitoring

---

## 🚀 Implementation Timeline

### Week 1-2: Foundation
- [ ] Database schema (PostgreSQL + pgvector)
- [ ] FastAPI project structure
- [ ] User authentication (JWT)
- [ ] Project/decision models

### Week 2-3: Extraction Pipeline
- [ ] Claude integration (initial extraction)
- [ ] APScheduler task queue
- [ ] Vector embedding (sentence-transformers)
- [ ] Decision storage

### Week 3-4: Agent Tools
- [ ] retrieve_similar_decisions (vector search)
- [ ] validate_consistency (Claude)
- [ ] calculate_confidence_score (local)
- [ ] flag_anomalies (local)

### Week 4-5: Frontend Dashboard
- [ ] React project setup (Vite)
- [ ] Timeline component (with virtual scrolling)
- [ ] Filters (discipline, date, meeting type)
- [ ] Decision drill-down modal

### Week 5-6: Integration & Testing
- [ ] End-to-end webhook flow
- [ ] Tactiq integration test
- [ ] Comprehensive test suite
- [ ] Performance optimization

### Week 6-8: Launch Preparation
- [ ] User acceptance testing (Gabriela + team)
- [ ] Deployment to production
- [ ] Monitoring setup (Sentry, Railway)
- [ ] Documentation for end-users

---

## 👥 Team Responsibilities

| Role | Documents | Deliverables |
|------|-----------|-------------|
| **@architect (Aria)** | All | Complete architecture spec ✅ |
| **@dev** | 02, 03, 04 | Backend implementation |
| **@ux-design-expert** | 05 | Frontend mockups + design system |
| **@devops** | 06, 07 | Infrastructure + security |
| **@data-engineer** | 03 | Database optimization |
| **@qa** | All | Test plan + execution |

---

## 🔐 Security Highlights

✅ **Authentication:** JWT tokens with 7-day expiration
✅ **Authorization:** Role-based access control (director, architect, client)
✅ **Transport:** HTTPS/TLS 1.3 everywhere
✅ **Data:** bcrypt passwords, encrypted connections, SSL database
✅ **Input:** Parameterized queries, Pydantic validation
✅ **Output:** React auto-escape XSS protection
✅ **Webhooks:** HMAC-SHA256 signature verification
✅ **API:** Rate limiting (100 req/min per user)
✅ **Monitoring:** Sentry error tracking + logging
✅ **Backup:** Daily automated backups, 7-day retention

---

## 📋 Pre-Implementation Checklist

### Architecture Review
- [x] System architecture diagram reviewed
- [x] Technology stack decided
- [x] Repository structure approved
- [x] Data model finalized
- [x] API contract finalized

### Team Alignment
- [x] All team members reviewed docs
- [x] Questions/concerns addressed
- [x] Timeline realistic and approved
- [x] Budget constraints understood
- [x] Success criteria agreed

### External Setup (by @devops)
- [ ] GitHub repositories created (2 repos)
- [ ] Supabase project initialized
- [ ] Railway/Render projects created
- [ ] Vercel project connected
- [ ] Sentry project created
- [ ] Environment variables configured

---

## 🔄 Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-07 | Initial complete architecture |
| - | - | - |

**Last Updated:** 2026-02-07
**Status:** ✅ Complete and ready for @dev to begin implementation

---

## 📞 Getting Help

### Questions About...
- **System Design** → Ask @architect (Aria)
- **Backend Implementation** → Ask @dev
- **Frontend Design** → Ask @ux-design-expert
- **Database Schema** → Ask @data-engineer
- **Deployment/Ops** → Ask @devops
- **Security** → Ask @devops + @architect
- **Testing** → Ask @qa

### Common Questions

**Q: What if Claude API costs exceed budget?**
A: Use Haiku model for tool calls, optimize prompts, batch processing

**Q: How long will extraction take?**
A: 2-3 minutes wall-clock time per 4-hour meeting (async processing)

**Q: Can we scale to 100+ users?**
A: Yes. Add more backend instances via Railway/Render. Database may need upgrade to paid tier.

**Q: What happens if Supabase goes down?**
A: Railway health checks will detect within 30 seconds. Redirect users to status page. Restore from daily backup.

**Q: How do we handle user data deletion?**
A: Soft-delete (set deleted_at flag). Can be restored. Hard delete available on request (Phase 2).

---

## 🎓 Architecture Philosophy

**DecisionLog is designed around these principles:**

1. **Simplicity First** - Use boring, well-established technology (PostgreSQL, FastAPI, React)
2. **Cost Efficiency** - MVP runs on ~$30/month using free/cheap services
3. **Scalability** - Everything can be upgraded: more instances, paid database tier, HNSW vectors
4. **Maintainability** - Clear separation of concerns, documented patterns, reproducible deployments
5. **Security First** - HTTPS everywhere, JWT auth, RBAC, verified webhooks, audit logging
6. **User-Focused** - Timeline view optimized for how architects actually work (quick scanning, drill-down)

---

## ✨ What's Next

1. **This week:** @devops provisions infrastructure (repos, databases, deployment pipelines)
2. **Next week:** @dev starts backend foundation + database setup
3. **Week 2:** @dev + @ux-design-expert coordinate on API contracts
4. **Week 3:** @dev extraction pipeline, @ux-design-expert frontend design
5. **Week 4:** Full team integration + testing
6. **Week 6:** Launch to Gabriela + 9-person team

---

**Ready to build the future of architectural decision management! 🚀**

*Aria, arquitetando o futuro* 🏗️
