# Releasing and Version Management

This document outlines the release process for the OpenAPI MCP Generator monorepo using Changesets.

## Overview

The project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases across the monorepo packages:
- `@aigentools/mcpgen-core` - Core generator library
- `@aigentools/mcpgen` - Command-line interface

## Release Workflow

### 1. Making Changes

When you make changes to any package, follow this process:

#### Add a Changeset
```bash
# Interactive changeset creation
bun changeset

# Or use the add command explicitly
bun changeset add
```

This will prompt you to:
1. Select which packages are affected
2. Choose the version bump type (patch/minor/major)
3. Write a summary of the changes

#### Changeset Types
- **Patch** (0.0.X) - Bug fixes, documentation updates
- **Minor** (0.X.0) - New features, non-breaking changes
- **Major** (X.0.0) - Breaking changes

#### Example Changeset File
```yaml
---
"@aigentools/mcpgen-core": minor
"@aigentools/mcpgen": patch
---

Add support for Hono runtime with multiple transport protocols

- Added HTTP, SSE, and WebSocket transport support
- Enhanced template system for web server generation
- Updated CLI to support --runtime hono flag
```

### 2. Preparing a Release

When ready to release, update package versions and changelogs:

```bash
# Update versions based on changesets
bun run version:packages

# This runs: changeset version
```

This command:
- Calculates new version numbers based on changesets
- Updates `package.json` files
- Generates/updates `CHANGELOG.md` files
- Removes consumed changeset files

### 3. Publishing Packages

```bash
# Publish to npm and create git tags
bun run release

# This runs: changeset publish
```

This command:
- Publishes updated packages to npm
- Creates git tags for each release
- Only publishes packages with version changes

## Complete Release Example

```bash
# 1. Make your changes and add changeset
git checkout -b feature/new-runtime
# ... make changes ...
bun changeset
git add .
git commit -m "feat: add new runtime support"

# 2. When ready to release (usually on main branch)
git checkout main
git pull origin main

# 3. Version packages
bun run version:packages
git add .
git commit -m "chore: version packages"

# 4. Publish packages
bun run release

# 5. Push changes and tags
git push origin main --follow-tags
```

## Pre-release Workflow

For beta/alpha releases or testing:

### Enter Pre-release Mode
```bash
# Enter prerelease with tag (e.g., 'beta', 'alpha', 'next')
bun changeset pre enter beta
```

### Version and Publish Pre-release
```bash
# Version packages with prerelease tag
bun changeset version
git add .
git commit -m "chore: enter prerelease mode and version packages"

# Publish with prerelease tag
bun changeset publish
git push --follow-tags
```

### Exit Pre-release Mode
```bash
# Exit prerelease for stable release
bun changeset pre exit
bun changeset version
git add .
git commit -m "chore: exit prerelease mode and version packages"
bun changeset publish
git push --follow-tags
```

## Snapshot Releases

For testing specific commits without affecting version numbers:

```bash
# Create snapshot versions (0.0.0-TIMESTAMP format)
bun changeset version --snapshot

# Publish with custom tag to avoid affecting 'latest'
bun changeset publish --tag snapshot
```

## Checking Release Status

```bash
# Check current changeset status
bun changeset status

# Verbose output with version information
bun changeset status --verbose

# Check status since specific branch/tag
bun changeset status --since=main
```

## Configuration

The project is configured via `.changeset/config.json`:

```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Key Configuration Options

- **access**: Set to "public" for public npm packages
- **baseBranch**: Main development branch (usually "main" or "master")
- **updateInternalDependencies**: How to bump internal dependencies ("patch", "minor", "major")
- **linked**: Groups packages to release together with same version
- **fixed**: Groups packages to maintain identical versions

## Git Flow with Release Branches

The project can use Git Flow with release branches for better control and testing before production releases. This approach separates feature development from release preparation.

### Git Flow Branch Strategy

```
main (production)     ──●────●────●────●──
                        │    │    │    │
release/v1.2.0         ─●────●────●────╱
                       ╱     │    │
develop (integration) ●──●───●────●────●──
                         ╱    ╱    ╱
feature/new-runtime     ●────╱    ╱
feature/fix-bug               ●──╱
```

### Automated Git Flow Workflow

#### 1. Feature Development (develop → release/vX.Y.Z)
```bash
# Work on develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-hono-support
# ... make changes ...
bun changeset  # Add changeset for changes
git add .
git commit -m "feat: add Hono runtime support"
git push origin feature/add-hono-support

# Create PR to develop
# After PR approved and merged to develop...
```

#### 2. Release Branch Creation (automated)
```bash
# When ready for release, create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
git push origin release/v1.2.0
```

#### 3. Release Branch Processing (automated via GitHub Actions)
The release branch triggers versioning and testing:

```yaml
name: Release Branch
on:
  push:
    branches:
      - 'release/**'

jobs:
  version-packages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Version packages
        run: |
          bun changeset version
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore: version packages for release" || exit 0
          git push origin ${{ github.ref_name }}

      - name: Run full test suite
        run: |
          bun run build
          bun run typecheck
          bun run lint
          bun run test

      - name: Create Release PR
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.PAT_TOKEN }}
          branch: ${{ github.ref_name }}
          base: main
          title: "Release ${{ github.ref_name }}"
          body: |
            🚀 **Release ${{ github.ref_name }}**

            This PR merges the release branch to main and will trigger publishing.

            ## Changes
            - Automated version updates
            - Updated changelogs
            - All tests passing ✅

            **After merging this PR:**
            - Packages will be published to npm
            - Git tags will be created
            - GitHub release will be generated
```

#### 4. Production Release (main branch)
```yaml
name: Publish Release
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
    types: [closed]

jobs:
  publish:
    if: github.event.pull_request.merged == true && contains(github.event.pull_request.head.ref, 'release/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Publish packages
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
          bun changeset publish
          git push --follow-tags

      - name: Merge back to develop
        run: |
          git checkout develop
          git pull origin develop
          git merge main --no-ff -m "chore: merge release back to develop"
          git push origin develop
```

### Complete Git Flow Automation Setup

Create these workflow files in `.github/workflows/`:

#### `.github/workflows/release-branch.yml`
```yaml
name: Release Branch Workflow
on:
  push:
    branches:
      - 'release/**'
  workflow_dispatch:
    inputs:
      release_branch:
        description: 'Release branch name (e.g., release/v1.2.0)'
        required: true

jobs:
  prepare-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Check for changesets
        id: changeset-status
        run: |
          if bun changeset status --since=main; then
            echo "has-changesets=true" >> $GITHUB_OUTPUT
            echo "Found changesets to process"
          else
            echo "has-changesets=false" >> $GITHUB_OUTPUT
            echo "No changesets found"
          fi

      - name: Version packages
        if: steps.changeset-status.outputs.has-changesets == 'true'
        run: |
          bun changeset version
          git config user.name "release-bot"
          git config user.email "release-bot@users.noreply.github.com"
          git add .
          git commit -m "chore: version packages for ${{ github.ref_name }}" || exit 0
          git push origin ${{ github.ref_name }}

      - name: Run quality checks
        run: |
          bun run build
          bun run typecheck
          bun run lint
          bun run test

      - name: Create changelog summary
        run: |
          echo "## Release Summary" > release-notes.md
          echo "" >> release-notes.md
          find . -name "CHANGELOG.md" -path "*/packages/*" | while read changelog; do
            package_name=$(dirname $changelog | xargs basename)
            echo "### $package_name" >> release-notes.md
            echo "" >> release-notes.md
            # Get latest version changes (first section after ## header)
            awk '/^## / && ++count == 2 {exit} /^## / && count == 1 {next} count == 1' "$changelog" >> release-notes.md
            echo "" >> release-notes.md
          done

      - name: Create Release PR to Main
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.PAT_TOKEN }}
          branch: ${{ github.ref_name }}
          base: main
          title: "🚀 Release ${{ github.ref_name }}"
          body-path: release-notes.md
          labels: |
            release
            auto-merge
```

#### `.github/workflows/publish-release.yml`
```yaml
name: Publish Release
on:
  pull_request:
    branches: [main]
    types: [closed]

jobs:
  publish:
    if: |
      github.event.pull_request.merged == true &&
      contains(github.event.pull_request.head.ref, 'release/') &&
      contains(github.event.pull_request.labels.*.name, 'release')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Publish to npm
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
          bun changeset publish

      - name: Push tags
        run: git push --follow-tags

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.PAT_TOKEN }}
        with:
          tag_name: ${{ github.event.pull_request.head.ref }}
          release_name: Release ${{ github.event.pull_request.head.ref }}
          body: ${{ github.event.pull_request.body }}
          draft: false
          prerelease: false

      - name: Merge back to develop
        run: |
          git fetch origin develop
          git checkout develop
          git merge main --no-ff -m "chore: merge ${{ github.event.pull_request.head.ref }} back to develop"
          git push origin develop
```

### Manual Git Flow Commands

For manual control, you can use these commands:

```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Version packages and commit
bun changeset version
git add .
git commit -m "chore: version packages for v1.2.0"
git push origin release/v1.2.0

# Create PR to main (manual review)
gh pr create --base main --title "Release v1.2.0" --body "Release branch ready for production"

# After PR merge, main will auto-publish and merge back to develop
```

### Configuration Updates

Update `.changeset/config.json` for Git Flow:

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "your-org/openapi-mcp-generator" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "develop",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Hotfix Workflow

For critical production fixes:

```yaml
name: Hotfix Workflow
on:
  push:
    branches:
      - 'hotfix/**'

jobs:
  hotfix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Create emergency changeset
        run: |
          bun changeset --empty
          # Manually edit changeset for patch version

      - name: Version and publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          bun changeset version
          git add .
          git commit -m "hotfix: emergency patch"
          echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
          bun changeset publish
          git push --follow-tags

      - name: Create PRs to main and develop
        run: |
          gh pr create --base main --title "Hotfix: ${{ github.ref_name }}"
          gh pr create --base develop --title "Hotfix: ${{ github.ref_name }}"
```

This Git Flow approach provides:
- **Controlled releases** through release branches
- **Automated versioning** when release branch is created
- **Quality gates** with tests before production
- **Automatic publishing** when release PR is merged
- **Branch synchronization** (main → develop merges)
- **Emergency hotfix support**

## Best Practices

### 1. Changeset Guidelines
- **One changeset per logical change**: Don't bundle unrelated changes
- **Clear summaries**: Write meaningful changeset descriptions
- **Appropriate version bumps**: Follow semantic versioning principles
- **Test before release**: Always test changes before publishing

### 2. Version Bump Guidelines

**Patch (0.0.X)**
- Bug fixes
- Documentation updates
- Internal refactoring without API changes
- Dependency updates (non-breaking)

**Minor (0.X.0)**
- New features
- New CLI options or flags
- New export functions
- Backward-compatible changes

**Major (X.0.0)**
- Breaking API changes
- Removed functions or options
- Changed function signatures
- Required Node.js version changes

### 3. Release Timing
- **Regular releases**: Aim for consistent release schedule
- **Security patches**: Release immediately for security fixes
- **Breaking changes**: Communicate well in advance
- **Coordinate releases**: Ensure related packages are updated together

### 4. Communication
- **Changelog quality**: Maintain clear, user-focused changelogs
- **Migration guides**: Provide upgrade instructions for breaking changes
- **Release notes**: Highlight important changes in GitHub releases

## Troubleshooting

### Common Issues

**"No changesets found"**
```bash
# Create a changeset first
bun changeset

# Or create empty changeset for non-package changes
bun changeset --empty
```

**"Package not published"**
- Check package.json `private` field (should be false for published packages)
- Verify npm authentication: `npm whoami`
- Check if version already exists: `npm view <package-name> versions --json`

**"Git tag already exists"**
```bash
# Remove local tag
git tag -d <tag-name>

# Remove remote tag (careful!)
git push origin --delete <tag-name>
```

**"Dependency version conflicts"**
- Update internal dependencies: Set `updateInternalDependencies` in config
- Use `bun changeset version --ignore <package-name>` to skip specific packages

### Getting Help

- **Changesets docs**: https://github.com/changesets/changesets
- **npm publish docs**: https://docs.npmjs.com/cli/v8/commands/npm-publish
- **Semantic versioning**: https://semver.org/

## Available Scripts

The following npm scripts are available for release management:

```json
{
  "changeset": "changeset",
  "version:packages": "changeset version",
  "release": "changeset publish"
}
```

Use these scripts consistently across the project for release operations.
