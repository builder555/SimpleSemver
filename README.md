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
      - name: Run Semver
        uses: builder555/simple-semver@v1
```
