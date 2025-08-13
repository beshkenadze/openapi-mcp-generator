# Releasing and Version Management

This document outlines the **fully automated** release process for the OpenAPI MCP Generator monorepo using Changesets and GitHub Actions.

## Overview

The project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases across the monorepo packages:
- `@aigentools/mcpgen-core` - Core generator library
- `@aigentools/mcpgen` - Command-line interface

**🚀 Fully Automated Workflow**: All releases are handled automatically by GitHub Actions. No local release commands are required.

## Automated Release Workflow

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

### 2. Automated Release Process

Once changesets are merged to the `main` branch, GitHub Actions automatically handles the entire release process:

#### Automatic Version Management
```yaml
# .github/workflows/changesets.yml
name: Changesets
on:
  push:
    branches: [main]
```

The workflow automatically:
1. **Detects changesets** in the main branch
2. **Creates a Release PR** with version updates and changelogs
3. **Waits for PR approval** (manual review step)
4. **When PR is merged**, automatically:
   - Publishes packages to npm
   - Creates GitHub releases with changelogs
   - Builds and uploads cross-platform CLI binaries
   - Creates git tags

#### Complete Automated Release Example

```bash
# 1. Create feature branch and add changeset
git checkout -b feature/new-runtime
# ... make changes ...
bun changeset
git add .
git commit -m "feat: add new runtime support"
git push origin feature/new-runtime

# 2. Create PR to main
gh pr create --base main --title "feat: add new runtime support"

# 3. After PR is merged to main, GitHub Actions automatically:
#    - Creates a "Version Packages" PR
#    - When that PR is merged, publishes to npm and creates releases

# 4. No local release commands needed! 🎉
```

### 3. What Happens Automatically

When you push changesets to the `main` branch:

#### Step 1: Release PR Creation
```yaml
# GitHub Actions detects changesets and:
- name: Create Release Pull Request or Publish to npm
  uses: changesets/action@v1
  with:
    version: bun changeset version
    title: '🚀 Version Packages'
```

- Automatically calculates new version numbers
- Updates `package.json` files
- Generates/updates `CHANGELOG.md` files  
- Creates a PR with all version changes

#### Step 2: Publishing (when Release PR is merged)
```yaml
# When Release PR is merged, GitHub Actions:
- name: Build Cross-Platform Binaries
- name: Upload Binaries to GitHub Release
```

- Publishes packages to npm
- Creates GitHub releases with changelogs
- Builds CLI binaries for Linux, macOS, and Windows
- Uploads binaries to GitHub releases
- Creates git tags automatically

#### Step 3: Installation Options
After automated release, users can install via:

```bash
# Install via npm
bunx @aigentools/mcpgen

# Or download platform-specific binaries
wget https://github.com/beshkenadze/openapi-mcp-generator/releases/latest/download/mcpgen-linux-x64
wget https://github.com/beshkenadze/openapi-mcp-generator/releases/latest/download/mcpgen-macos-x64
wget https://github.com/beshkenadze/openapi-mcp-generator/releases/latest/download/mcpgen-windows-x64.exe
```

## Pre-release Workflow (Manual Override)

For beta/alpha releases, you can temporarily override automation:

### Enter Pre-release Mode
```bash
# Enter prerelease with tag (e.g., 'beta', 'alpha', 'next')
bun changeset pre enter beta
git add .
git commit -m "chore: enter prerelease mode"
git push origin main
# This will trigger automated pre-release publishing
```

### Exit Pre-release Mode
```bash
# Exit prerelease for stable release
bun changeset pre exit
git add .
git commit -m "chore: exit prerelease mode"
git push origin main
# This will trigger normal automated release flow
```

## Monitoring Automated Releases

### Check Release Status
```bash
# Check if changesets are waiting to be released
bun changeset status

# View what changes are pending
bun changeset status --verbose

# Check GitHub Actions workflow status
gh run list --workflow=changesets.yml

# View latest workflow run details
gh run view
```

### Monitor Release Progress
```bash
# View current releases
gh release list

# Check if Release PR exists
gh pr list --label="🚀 Version Packages"

# View release workflow logs
gh run view --log
```

## Automated Release Configuration

### Changesets Configuration
The project is configured via `.changeset/config.json`:

```json
{
  "changelog": ["@changesets/changelog-github", { 
    "repo": "beshkenadze/openapi-mcp-generator" 
  }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### GitHub Actions Configuration
The automation is powered by `.github/workflows/changesets.yml`:

```yaml
name: Changesets
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      packages: write
    steps:
      - uses: changesets/action@v1
        with:
          publish: bun changeset publish
          version: bun changeset version
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.PAT_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      # Automatic binary building and upload
      - name: Build Cross-Platform Binaries
      - name: Upload Binaries to GitHub Release
```

### Required Secrets
For automation to work, these GitHub secrets must be configured:

- `PAT_TOKEN` - Personal Access Token for creating PRs and releases
- `NPM_TOKEN` - Token for publishing to npm registry

### Key Configuration Options

- **changelog**: Uses GitHub changelog with PR links
- **access**: Set to "public" for npm publishing  
- **baseBranch**: Main development branch ("main")
- **createGithubReleases**: Automatically creates GitHub releases

## Triggering a Release

To trigger an automated release:

### Option 1: Merge Existing Release PR
```bash
# Check if a Release PR already exists
gh pr list --label="🚀 Version Packages"

# If found, merge the Release PR
gh pr merge <pr-number> --squash
```

### Option 2: Force Trigger Release (if no pending changesets)
```bash
# Create an empty changeset to trigger release workflow
bun changeset --empty

# Or create a documentation changeset
bun changeset
# Select packages, choose "patch", write "docs: update release documentation"

# Commit and push to main
git add .
git commit -m "docs: update release documentation" 
git push origin main
```

The GitHub Actions workflow will automatically:
1. Create a "🚀 Version Packages" PR
2. When merged, publish to npm and create GitHub releases
3. Upload cross-platform CLI binaries

## Best Practices

### 1. Changeset Guidelines
- **One changeset per logical change**: Don't bundle unrelated changes
- **Clear summaries**: Write meaningful changeset descriptions
- **Appropriate version bumps**: Follow semantic versioning principles
- **Let automation handle publishing**: Never run manual release commands

### 2. Version Bump Guidelines

**Patch (0.0.X)**
- Bug fixes, documentation updates, dependency updates (non-breaking)

**Minor (0.X.0)**  
- New features, new CLI options, backward-compatible changes

**Major (X.0.0)**
- Breaking API changes, removed functions, changed signatures

### 3. Communication
- **Quality changelogs**: GitHub automation generates linked changelogs
- **Release notes**: GitHub releases are created automatically with changelogs
- **Breaking changes**: Communicate in changeset descriptions

## Troubleshooting Automated Releases

### Common Issues

**"No changesets found when trying to release"**
```bash
# Create a changeset first
bun changeset
# Then commit and push to trigger automation
```

**"GitHub Actions failing"**
```bash
# Check workflow status
gh run list --workflow=changesets.yml

# View logs for debugging
gh run view --log
```

**"Release PR not created"**
- Verify PAT_TOKEN and NPM_TOKEN secrets are set
- Check workflow permissions in GitHub Actions
- Ensure changesets exist in `.changeset/` directory

**"Package not published to npm"** 
- Check NPM_TOKEN is valid: Test token permissions
- Verify package.json `private` field is `false`
- Check GitHub Actions logs for npm publish errors

### Getting Help

- **Changesets docs**: https://github.com/changesets/changesets
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **View automation logs**: `gh run view --log`
