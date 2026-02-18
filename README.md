# Truss CLI

`truss check` enforces architecture boundaries from `truss.yml` and returns CI-friendly exit codes.

## Workflow

1. Load and validate `truss.yml`
2. Discover source files (`.ts/.tsx/.js/.jsx`, ignore junk folders)
3. Parse imports and build dependency edges
4. Assign files to layers
5. Evaluate rules
6. Apply suppressions
7. Render human or JSON output
8. Exit with status code

## Exit Code Matrix

- `0` No unsuppressed violations
- `1` One or more unsuppressed architectural violations
- `2` Configuration or CLI usage error
- `3` Internal error

## What Developers See on Failure

- Rule name
- Source and target layer
- File path + line number
- Import statement
- Reason
- Summary counts for unsuppressed/suppressed/total

## Sample Output (Violation)

```text
Truss: Architectural violations found (1)

no-import
Layers: api -> db
src/api/user.ts:15
import { db } from "../db/client"
Reason: API layer must not depend directly on DB layer.

Suppressed violations: 1 (intentional, still reported)
Summary:
Unsuppressed: 1
Suppressed: 1
Total: 2
```

## Sample Output (Success)

```text
Truss: No Architectural violations found
Checked 9000 files
```

## Run Locally

```bash
npm install
npm run truss:check
npm run truss:check:json
```

## CI (GitHub Actions)

### Fail PR on Violations

```yaml
name: Truss
on:
  pull_request:
  push:
    branches: [main]

jobs:
  truss:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run truss:check
```

### Upload JSON Report Artifact

```yaml
name: Truss (JSON Report)
on: [pull_request]

jobs:
  truss:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run truss:check:json > truss-report.json
      - uses: actions/upload-artifact@v4
        with:
          name: truss-report
          path: truss-report.json
```
