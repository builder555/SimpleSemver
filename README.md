# SimpleSemver
Github Action to create a new version and release notes from commit messages

Create commits with prefixes as follows:

| prefix            | version increment    |
|------------------|----------------------|
| `fix:`            | patch - 0.0.X        | 
| `feat:`          | minor - 0.X.0        | 
| `feat!` or `fix!` | major - X.0.0        |

Any other prefixes do not change the version. for example you may use `chore:` for readme updates.

Only prefixes `fix! feat! fix: feat: chore:` are removed from the commit message when parsed into release notes.

The action creates release notes that look like this:

## Breaking Changes
* initial commit (5171b04)

## Features
* testing partial ci workflow (526cbfd)
* create a release automatically (7b62781)

## Fixes
* do not reinitialize websocket every time (6fb5826)
* remove obsoleted version (9364747)

## Other
* moved gitignore (38b4319)
* readme typo (14b622a)
* bump version to v1.13.18 (33c87cc)

Use in your workflow:

```yaml

on:
  push:
    branches:
      - master

jobs:
  semver-action:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.semver-action.outputs.version }}
      release-notes: ${{ steps.semver-action.outputs.release-notes }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Get last version and hash
        id: last-version
        # this assumes you use tags like v0.0.1 - that's what it uses to get hash of the last tagged version
        run: |
          LAST_TAG=$(git describe --tags --abbrev=0 --match "v*.*.*" 2>/dev/null || echo "") || true
          LAST_VERSION=$(echo $LAST_TAG | tr -d -c 0-9. || echo 0.0.0) || true
          COMMIT_HASH=$(git rev-list -n 1 $LAST_TAG 2>/dev/null || echo "") || true
          echo "hash=$COMMIT_HASH" >> $GITHUB_OUTPUT
          echo "version=$LAST_VERSION" >> $GITHUB_OUTPUT

      - name: Semver Action
        id: semver-action
        uses: builder555/simple-semver@v2
        with:
          last-version: ${{ steps.last-version.outputs.version }}
          last-hash: ${{ steps.last-version.outputs.hash }}
      # For the next 2 steps make sure you enable Read and Write (settings > actions > general > Workflow permissions)
      - name: Commit version changes
        if: steps.semver-action.outputs.version != ''
        run: |
        git config --local user.email "github-actions[bot]@users.noreply.github.com"
        git config --local user.name "github-actions[bot]"
        git tag -a v${{ steps.semver-action.outputs.major }} -m "Creating release v${{ steps.semver-action.outputs.major }}" 2>/dev/null || true
        git tag -a v${{ steps.semver-action.outputs.version }} -m "Creating release v${{ steps.semver-action.outputs.version }}"
      
      - name: Push changes
        if: steps.semver-action.outputs.version != ''
        uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          branch: ${{ github.ref }}
          tags: true
```
