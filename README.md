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

## Run Truss on Local Project

### Local-Project-Setup

1. clone repository to local machine or use local project
2. create a truss.yml config file in root directory
3. run CLI command:

```bash
  npm run truss:check -- --repo /name/dir/example-local-repo --config truss.yml
```

### Example truss.yml in example-local-repo root directory

```yaml
version: "1"

layers:
  client:
    - "client/**/*.ts"
    - "client/**/*.tsx"
  server:
    - "server/**/*.ts"
  shared:
    - "shared/**/*.ts"

rules:
  # Client must not import from server
  - name: no-client-to-server
    from: client
    disallow: [server]
    message: Client must not import from server.

  # Shared layer should not depend on client or server
  - name: shared-is-independent
    from: shared
    disallow: [client, server]
    message: Shared code must not import from client or server.

policy:
  failOnSuppressedViolations: false
  failOnAnyViolation: false
  maxSuppressions: 5
  failOnInvalidSuppressions: true

suppressions:
  - file: some/file.ts
    rule: no-client-to-server
    reason: Temporary exception; refactor tracked in ticket X.
    expiresAt: "2026-06-01"
```

### Run Truss on repo to check on

```bash
npm run truss:check -- --repo /name/dir/example-local-repo --config truss.yml
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
