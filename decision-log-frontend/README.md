# DecisionLog Frontend

React 18 + TypeScript frontend for DecisionLog - AI-Powered Architectural Decision System.

## Setup

### Prerequisites
- Node.js 18+ (using npm, yarn, or pnpm)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API base URL
```

### Running Development Server

```bash
npm run dev
```

Server runs on: http://localhost:5173

### Building for Production

```bash
npm run build
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── timeline/        # Timeline view components
│   ├── filters/         # Filter components
│   ├── drill-down/      # Decision detail modal
│   ├── digest/          # Executive digest
│   └── common/          # Common components
├── pages/               # Page components
│   ├── Login.tsx        # Authentication
│   └── Projects.tsx     # Project list
├── hooks/               # Custom React hooks
├── services/            # API services
├── store/               # Zustand state management
├── types/               # TypeScript types
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── index.css            # Tailwind styles
```

## Development

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test                    # Run tests
npm run test:ui             # UI for tests
npm run test:coverage       # Coverage report
```

## Environment Variables

See `.env.example` for required variables:
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:8000/api)
- `VITE_SENTRY_DSN` - Sentry error tracking
- `VITE_ENVIRONMENT` - Environment (development, production)

## Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization

## API Documentation

Frontend communicates with backend API specified in `/docs/architecture/02-API-SPECIFICATION.md`

Key endpoints:
- `POST /auth/login` - User authentication
- `GET /auth/me` - Current user info
- `GET /projects` - List projects
- `GET /projects/{id}` - Project details
- `GET /projects/{id}/decisions` - List decisions with filters
- `GET /decisions/{id}` - Decision details
- `GET /projects/{id}/digest` - Executive digest

## Authentication

JWT tokens stored in localStorage with automatic request interceptors.

Flow:
1. User logs in at /login
2. Token stored in Zustand + localStorage
3. Axios automatically adds Authorization header
4. 401 errors clear token and redirect to /login

## Deployment

See `/docs/architecture/06-DEPLOYMENT.md` for deployment instructions.

Supported platforms:
- Vercel (recommended, automatic)
- AWS S3 + CloudFront
- Azure Static Web Apps
- GitHub Pages

## Performance

Optimizations implemented:
- Code splitting with React.lazy
- React Query caching (5min stale time)
- Tailwind CSS purging
- Virtual scrolling for large lists (future)
- Service workers for offline support (future)

## Testing Strategy

- Unit tests for hooks and utilities
- Component tests for complex UI
- Integration tests for auth flow
- E2E tests for critical paths

## Contributing

Follow React best practices:
- Use functional components with hooks
- Keep components small and focused
- Write tests for new features
- Use TypeScript for type safety
