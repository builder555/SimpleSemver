# SimpleSemver
Github Action to create a new version and release notes from commit messages

Create commits with prefixes as follows:

| prefix            | version increment    |
|------------------|----------------------|
| `fix:`            | patch - 0.0.X        | 
| `feat:`          | minor - 0.X.0        | 
| `feat!` or `fix!` | major - X.0.0        | 

Use in your workflow:

```yaml

on: [push]

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
        run: |
          LAST_VERSION=$(git describe --tags --abbrev=0 2>/dev/null | tr -d -c 0-9.)
          COMMIT_HASH=$(git rev-parse v$LAST_VERSION)
          echo "hash=$COMMIT_HASH" >> $GITHUB_OUTPUT
          echo "version=$LAST_VERSION" >> $GITHUB_OUTPUT

      - name: Semver Action
        id: semver-action
        uses: builder555/simple-semver@v1
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
