# Task 003: npm Publish Instructions Report

## Summary

This report provides comprehensive instructions for publishing the RAF (Ralph's Automation Framework) package to the npm registry.

---

## Prerequisites

### 1. npm Account Setup

Before publishing, you need an npm account:

1. **Create an npm account** at https://www.npmjs.com/signup
2. **Verify your email address** via the confirmation email from npm

### 2. Authentication

Log in to npm from your terminal:

```bash
npm login
```

You will be prompted for:
- Username
- Password
- Email (public)
- One-time password (if 2FA is enabled - recommended)

To verify your login status:

```bash
npm whoami
```

This should display your npm username.

---

## Pre-Publish Checklist

Before publishing, verify the following:

### Code Quality Checks

```bash
# 1. Run all tests
npm test

# 2. Type check (no errors)
npm run lint

# 3. Build the project
npm run build
```

### Package Configuration Verification

The RAF package.json is already configured with:

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `raf` | Package name on npm |
| `version` | Current version | Semantic version |
| `description` | Automated Task Planning... | npm search description |
| `bin` | `{"raf": "./dist/index.js"}` | CLI command registration |
| `main` | `./dist/index.js` | Entry point |
| `engines` | `node >=20.0.0` | Node.js version requirement |
| `repository` | GitHub URL | Links to source code |
| `license` | `MIT` | License type |
| `keywords` | `claude, cli, automation...` | npm search keywords |
| `prepublishOnly` | `npm run build` | Auto-builds before publish |

### Verify Package Contents

Check what will be published:

```bash
npm pack --dry-run
```

This shows all files that will be included in the package.

---

## Version Management

Use npm's version command to bump the version following [Semantic Versioning](https://semver.org/):

### Version Types

| Command | When to Use | Example |
|---------|-------------|---------|
| `npm version patch` | Bug fixes, minor changes | 0.2.7 → 0.2.8 |
| `npm version minor` | New features, backwards compatible | 0.2.7 → 0.3.0 |
| `npm version major` | Breaking changes | 0.2.7 → 1.0.0 |

### Version Bump Example

```bash
# Bump patch version (bug fixes)
npm version patch

# Bump minor version (new features)
npm version minor

# Bump major version (breaking changes)
npm version major

# Set specific version
npm version 1.0.0
```

The `npm version` command will:
1. Update `version` in package.json
2. Create a git commit with the new version
3. Create a git tag (e.g., `v0.2.8`)

---

## Publishing

### Publish Command

```bash
npm publish
```

The `prepublishOnly` hook will automatically run `npm run build` before publishing.

### Publish Options

```bash
# Publish with public access (for scoped packages)
npm publish --access public

# Publish with a specific tag (e.g., beta)
npm publish --tag beta

# Dry run - see what would be published without actually publishing
npm publish --dry-run
```

### First-Time Publishing

For the first publish, simply run:

```bash
npm publish
```

**Note**: The package name `raf` may already be taken on npm. If so, you have options:
1. Use a scoped package name (e.g., `@yourname/raf`)
2. Choose an alternative name (e.g., `raf-cli`, `ralph-raf`, `claude-raf`)

To check if a package name is available:

```bash
npm view raf
```

If you get a 404 error, the name is available.

---

## Post-Publish Verification

After publishing, verify the package is available:

### Check npm Registry

```bash
# View package info
npm view raf

# View specific version
npm view raf@0.2.7

# View all versions
npm view raf versions
```

### Test Installation

In a separate directory:

```bash
# Install globally
npm install -g raf

# Verify CLI works
raf --version
raf --help

# Test commands
raf status
```

### Verify on npm Website

Visit: https://www.npmjs.com/package/raf

---

## RAF-Specific Considerations

### Automatic Build Hook

RAF is configured with a `prepublishOnly` script:

```json
"prepublishOnly": "npm run build"
```

This ensures the TypeScript is compiled before publishing. You don't need to run `npm run build` manually before publishing.

### CLI Binary

The `bin` field registers the `raf` command:

```json
"bin": {
  "raf": "./dist/index.js"
}
```

After global installation (`npm install -g raf`), users can run `raf` directly in their terminal.

### Node.js Version Requirement

RAF requires Node.js 20+:

```json
"engines": {
  "node": ">=20.0.0"
}
```

Users with older Node.js versions will see a warning during installation.

### Native Dependencies

RAF uses `node-pty` which has native bindings. This is handled via prebuilt binaries, but note:
- The `postinstall` script handles macOS permission issues
- Users on less common platforms may need build tools installed

---

## Common Issues and Troubleshooting

### 1. "You must be logged in to publish packages"

```bash
npm login
```

### 2. "Cannot publish over previously published version"

You need to bump the version:

```bash
npm version patch
npm publish
```

### 3. "Package name too similar to existing packages"

npm may reject names too similar to existing packages. Try:
- Adding a unique prefix/suffix
- Using a scoped package: `@yourname/raf`

### 4. "You do not have permission to publish"

You need to be added as a maintainer or the package owner.

### 5. Package Name Already Taken

If `raf` is taken:

```bash
# Check availability
npm view raf

# Option 1: Use scoped name
# Update package.json: "name": "@yourname/raf"
npm publish --access public

# Option 2: Choose alternative name
# Update package.json with new name
```

### 6. Build Fails During Publish

If `prepublishOnly` fails:

```bash
# Check for TypeScript errors
npm run lint

# Ensure tests pass
npm test

# Try building manually
npm run build
```

---

## Quick Reference

### Complete Publish Flow

```bash
# 1. Ensure everything works
npm test
npm run lint
npm run build

# 2. Bump version
npm version patch  # or minor/major

# 3. Publish
npm publish

# 4. Push tags to git
git push --follow-tags

# 5. Verify
npm view raf
```

### One-Line Publish (After First Time)

```bash
npm version patch && npm publish && git push --follow-tags
```

---

## Summary

Publishing RAF to npm requires:
1. An npm account with verified email
2. Authentication via `npm login`
3. Passing tests and build
4. Version bump using `npm version`
5. Publishing with `npm publish`
6. Verification via `npm view` and test installation

The package is well-configured with proper metadata, CLI registration, and automatic build hooks.
