# Dead Code Analysis Report

Generated: 2026-01-27

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Unused Types | 1 | SAFE to remove |
| Unused Exports | 1 | SAFE to make internal |
| Unexported Types | 2 | SAFE to make internal |
| Unused Dependencies | 1 | SAFE to remove |

## Findings

### SAFE - Unused Types

| Type | Location | Reason |
|------|----------|--------|
| `TmuxSettings` | src/types/index.ts:1 | Was used by removed getSettings/saveSettings API methods |

### SAFE - Exports That Should Be Internal

| Export | Location | Reason |
|--------|----------|--------|
| `useLocalStorageState` | src/hooks/useLocalStorageState.ts:6 | Only used internally by useLocalStorageString/useLocalStorageBoolean |
| `CoordinatedState` | src/components/view/ViewStateCoordinator.tsx:15 | Only used within same file |
| `CoordinatedHandlers` | src/components/view/ViewStateCoordinator.tsx:38 | Only used within same file |

### SAFE - Unused Dependencies

| Dependency | Reason |
|------------|--------|
| `web-vitals` | Not imported or used anywhere in codebase |

### CAUTION - Keep These

| Item | Location | Reason |
|------|----------|--------|
| `TmuxPane` | src/types/index.ts:13 | Used by TmuxWindow interface |
| Test files | src/**/__tests__/*.ts | Required for testing |
| `setupProxy.js` | src/setupProxy.js | Required for development proxy |
| `@testing-library/*` | package.json | Required for tests |
| `@types/jest`, `@types/node` | package.json | Required TypeScript types |

## Proposed Actions

1. Remove `TmuxSettings` interface from types/index.ts
2. Change `useLocalStorageState` from `export function` to `function` (internal only)
3. Change `CoordinatedState` and `CoordinatedHandlers` from `export interface` to `interface`
4. Remove `web-vitals` from package.json dependencies

## Verification Plan

- Run full test suite before each change
- Verify build passes after each change
- Rollback if tests fail
