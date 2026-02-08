# Mock Data Setup - View Epic 3 Project Details

You have **two options** to view the Epic 3 Project Detail page with data:

---

## ✅ Option 1: Use Frontend Mock Data (EASIEST - No Backend Needed)

This is the fastest way to see Epic 3 components in action.

### Step 1: Enable Mock Mode

Edit `decision-log-frontend/src/pages/ProjectDetail.tsx`:

```typescript
// At the top, change the import from:
import { useDecisions } from '../hooks/useDecisions'

// To:
import { useDecisionsMock as useDecisions } from '../hooks/useDecisionsMock'
```

### Step 2: Start Frontend Only

```bash
cd decision-log-frontend
npm run dev
```

### Step 3: View Mock Projects

1. Open http://localhost:5173/
2. Login with any email/password (mock mode accepts anything)
3. You'll see 6 mock projects
4. Click **any project** → See Timeline, Filters, Digest, Drilldown!

**Mock Project IDs Available:**
- `proj-001` - Downtown Tower Renovation (47 decisions)
- `proj-002` - Parkside Residential Complex (31 decisions)
- `proj-003` - Sustainable Research Campus (52 decisions)
- `proj-004` - Heritage District Restoration (28 decisions)
- `proj-005` - Airport Terminal Expansion (89 decisions)
- `proj-006` - Tech Campus Phase 2 (35 decisions)

**Mock Decisions:** 3 sample decisions with full data (structural, MEP, landscape)

---

## ✅ Option 2: Use Backend Seed Data (Full Stack)

This runs the real backend with seeded database.

### Step 1: Set Demo Mode

```bash
export DEMO_MODE=true
```

Or create `.env` in `decision-log-backend/`:
```
DEMO_MODE=true
DATABASE_URL=sqlite:///./decision_log.db
```

### Step 2: Run Seed Script

```bash
cd decision-log-backend
source venv/bin/activate
python -m app.database.seed
```

**This creates:**
- ✅ Test user: `test@example.com` / password: `password`
- ✅ Gabriela: `gabriela@soubim.com` / password: `password`
- ✅ Carlos: `carlos@mep.com` / password: `password`
- ✅ 2 Projects: "Residential Tower Alpha" and "Commercial Plaza Beta"

**Note:** Backend seed script only creates projects, NOT decisions yet. You'll see projects list but empty timelines.

### Step 3: Start Full Stack

```bash
# From project root
npm run dev
```

### Step 4: Login & View

1. Open http://localhost:5174/
2. Login with `test@example.com` / `password`
3. View seeded projects

---

## 🎯 Recommendation

**Use Option 1** to quickly validate Epic 3 implementation:
- ✅ No backend setup needed
- ✅ 3 sample decisions with full data
- ✅ All Epic 3 features visible (Timeline, Digest, Filters, Drilldown)
- ✅ Fast iteration for frontend work

**Use Option 2** when:
- Testing full-stack integration
- Building backend decision endpoints (Epic 3, Story 3.9)
- Production-like environment

---

## 📦 Mock Data Contents

### Projects (6 projects)
```typescript
mockProjects = [
  'Downtown Tower Renovation',
  'Parkside Residential Complex',
  'Sustainable Research Campus',
  'Heritage District Restoration',
  'Airport Terminal Expansion',
  'Tech Campus Phase 2',
]
```

### Decisions (3 sample decisions)
```typescript
mockDecisions = [
  {
    id: 'dec-001',
    statement: 'Use reinforced concrete for structural frame',
    discipline: 'structural',
    who: 'John Smith',
    consensus: { engineer: 'AGREE', architect: 'AGREE', client: 'AGREE' }
  },
  {
    id: 'dec-002',
    statement: 'Implement VRF HVAC system instead of chiller',
    discipline: 'mep',
    who: 'Sarah Johnson',
    consensus: { engineer: 'MIXED', architect: 'AGREE', client: 'AGREE' },
    anomaly_flags: ['dissent']
  },
  {
    id: 'dec-003',
    statement: 'Preserve existing trees on site',
    discipline: 'landscape',
    who: 'Emma Davis',
  }
]
```

### Executive Digest
```typescript
mockDigest = {
  total_decisions: 47,
  meetings_count: 12,
  consensus_percentage: 78,
  high_impact_count: 3,
  highlights: [...]
}
```

---

## 🔄 Switching Back to Real API

When backend is ready with real decision endpoints, change back:

```typescript
// In ProjectDetail.tsx
import { useDecisions } from '../hooks/useDecisions'  // Remove 'Mock'
```

---

## 🐛 Troubleshooting

**"Port 5173 in use"**
- Frontend auto-uses port 5174 (see screenshot)
- Navigate to http://localhost:5174/

**"No projects showing"**
- Check if using mock mode (Option 1)
- Verify login worked (check browser console for errors)

**"Decisions not loading"**
- Make sure you changed import to `useDecisionsMock`
- Check browser console for API errors
- Verify mock data exists in `src/lib/mockData.ts`

---

**Created:** 2026-02-08
**Epic:** Epic 3 - Dashboard & Visualization
**Related Files:**
- `src/lib/mockData.ts` - Mock data definitions
- `src/hooks/useDecisionsMock.ts` - Mock decisions hook
- `src/hooks/useProjectsMock.ts` - Mock projects hook
- `decision-log-backend/app/database/seed.py` - Backend seed script
