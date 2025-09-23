# GitHub Actions CI/CD Setup

This repository now includes automated CI/CD pipelines using GitHub Actions.

## Workflows

### 1. Complete CI/CD Pipeline (`ci-cd.yml`)
The main workflow that handles the entire pipeline:

- **Test Stage**: Runs linting, frontend tests, and API tests
- **Build Stage**: Builds the Next.js application
- **Deploy Staging**: Deploys to Vercel staging environment (github-actions branch)
- **Deploy Production**: Deploys to Vercel production environment (main branch)

### 2. Frontend CI (`frontend-ci.yml`)
Focused on frontend testing and building:
- Linting with ESLint
- Running Jest tests
- Building the application
- Uploading build artifacts

### 3. Backend CI (`backend-ci.yml`)
Focused on API route testing:
- API route tests
- Supabase connection testing

## Required Secrets

To enable deployment, add these secrets to your GitHub repository:

### Vercel Secrets
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### Supabase Secrets (for testing)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## How to Add Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the exact name listed above

## Testing Setup

The project now includes:
- Jest configuration for testing
- Testing Library for React component testing
- Basic test examples
- Coverage reporting

## Branch Strategy

- **`main`**: Production deployments
- **`github-actions`**: Staging deployments
- **Pull Requests**: Run tests and build verification

## Acceptance Criteria ✅

- [x] PRs trigger GitHub Actions workflow
- [x] Tests run automatically and must pass before merge
- [x] Successful deploy on merge to main branch
- [x] Separate staging and production environments
- [x] Test coverage reporting
- [x] Build artifact management
