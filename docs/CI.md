# CI/CD Documentation

## Overview

This document provides comprehensive information about the Continuous Integration (CI) setup for the CorpConnect project. The CI pipeline ensures code quality, type safety, and build integrity before code is merged into the main branches.

---

## GitHub Actions Workflow

### Workflow File Location
`.github/workflows/ci.yml`

### Trigger Events

The CI workflow runs automatically on:

- **Pull Requests** to `master` or `main` branches
- **Direct Pushes** to `master` or `main` branches
- **Manual Trigger** via GitHub Actions UI (workflow_dispatch)

### Jobs Overview

The CI pipeline consists of three parallel jobs:

#### 1. Code Quality Checks
**Purpose**: Ensure code meets quality standards and type safety requirements

**Checks Performed**:
- **ESLint**: Validates code against Next.js coding standards
  - Command: `npm run lint`
  - Configuration: `eslint.config.mjs`
  
- **TypeScript Type Checking**: Ensures type safety across the codebase
  - Command: `npx tsc --noEmit`
  - Configuration: `tsconfig.json`
  
- **Prisma Schema Validation**: Validates database schema integrity
  - Command: `npx prisma validate`
  - Checks: Schema syntax, relation consistency, field types

**Runtime**: ~1-2 minutes

---

#### 2. Build Verification
**Purpose**: Verify the application builds successfully without errors

**Steps**:
1. Install dependencies
2. Generate Prisma Client
3. Build Next.js application

**Command**: `npm run build`

**What it validates**:
- All pages compile correctly
- API routes are valid
- Static assets are processed
- No build-time errors
- Server and client components are properly separated

**Runtime**: ~2-4 minutes

---

#### 3. Unit Tests
**Purpose**: Run automated tests to verify functionality

**Testing Framework**: Jest with React Testing Library

**Command**: `npm test`

**Test Locations**:
- `__tests__/**/*.test.ts(x)`
- `**/*.test.ts(x)`
- `**/*.spec.ts(x)`

**Coverage Areas**:
- Components (`components/**`)
- Server Actions (`actions/**`)
- Data Layer (`data/**`)
- Utilities (`lib/**`)
- App Routes (`app/**`)

**Runtime**: ~1-3 minutes (depends on test count)

---

## Local Development

### Running CI Checks Locally

Before pushing code, you can run all CI checks locally to catch issues early:

#### 1. Linting
```bash
npm run lint
```

**Fix auto-fixable issues**:
```bash
npm run lint -- --fix
```

#### 2. Type Checking
```bash
npx tsc --noEmit
```

#### 3. Prisma Validation
```bash
npx prisma validate
```

#### 4. Build Verification
```bash
npm run build
```

#### 5. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

#### 6. Run All Checks (Recommended before pushing)
```bash
npm run lint && npx tsc --noEmit && npx prisma validate && npm test && npm run build
```

---

## Testing Guide

### Writing Tests

#### Test File Naming Conventions
- Place tests in `__tests__/` directory: `__tests__/myComponent.test.tsx`
- Or co-locate with source files: `myComponent.test.tsx`

#### Example Component Test
```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

#### Example Server Action Test
```typescript
import { myAction } from '@/actions/myAction'

describe('myAction', () => {
  it('should return success on valid input', async () => {
    const result = await myAction({ name: 'Test' })
    expect(result.success).toBe(true)
  })
})
```

#### Example Utility Function Test
```typescript
import { formatDate } from '@/lib/utils'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date)).toBe('January 15, 2024')
  })
})
```

### Test Coverage

View coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

**Coverage Goals** (recommended):
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

---

## Troubleshooting

### Common Issues

#### Issue: ESLint Errors
**Solution**: Run `npm run lint -- --fix` to auto-fix issues, then manually fix remaining errors.

#### Issue: TypeScript Errors
**Solution**: Check the error messages and fix type mismatches. Ensure all imports are correct.

#### Issue: Prisma Validation Fails
**Solution**: 
- Check `prisma/schema.prisma` for syntax errors
- Ensure all relations are properly defined
- Verify field types are valid

#### Issue: Build Fails
**Solution**:
- Check for missing environment variables (create `.env` from `.env.example`)
- Ensure all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next` and rebuild

#### Issue: Tests Fail
**Solution**:
- Run tests locally: `npm test`
- Check test output for specific failures
- Ensure test dependencies are installed
- Verify Prisma client is generated: `npx prisma generate`

#### Issue: CI Workflow Not Triggering
**Solution**:
- Ensure you're pushing to the correct branch
- Check GitHub Actions tab for workflow status
- Verify `.github/workflows/ci.yml` exists in the repository

---

## Branch Protection Rules (Recommended)

To enforce CI checks before merging, configure branch protection:

1. Go to **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `master` (or `main`)
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
4. Select required status checks:
   - ✅ Code Quality Checks
   - ✅ Build Verification
   - ✅ Unit Tests
5. Save changes

---

## CI Performance Optimization

### Caching Strategy
The workflow uses npm caching to speed up dependency installation:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

### Parallel Execution
All three jobs run in parallel to minimize total CI time.

### Expected CI Duration
- **Total Time**: ~3-5 minutes
- **Code Quality**: ~1-2 minutes
- **Build**: ~2-4 minutes
- **Tests**: ~1-3 minutes

---

## Maintenance

### Updating Dependencies

When updating testing dependencies:
```bash
npm update @testing-library/react @testing-library/jest-dom jest
```

### Adding New Checks

To add new CI checks, edit `.github/workflows/ci.yml`:

1. Add a new step to an existing job, or
2. Create a new job for complex checks

Example - Adding a new check:
```yaml
- name: Check Code Formatting
  run: npx prettier --check .
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/jest)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## Support

For CI-related issues:
1. Check the GitHub Actions logs for detailed error messages
2. Run checks locally to reproduce the issue
3. Review this documentation for troubleshooting steps
4. Contact the development team if issues persist

---

**Last Updated**: February 2026  
**Maintained By**: Development Team
