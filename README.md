# SimpleSemver
Github Action to create a new version and release notes from commit messages

Create commits with prefixes as follows:

| prefix            | version increment    |
|-------------------|----------------------|
| `fix:`            | patch - 0.0.X        | 
| `feat:`           | minor - 0.X.0        | 
| `feat!` or `fix!` | major - X.0.0        | 

Use in your workflow:

```yaml

on: [push]

jobs:
  semver-action:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.semver-action.outputs.tag }}
      version: ${{ steps.semver-action.outputs.version }}
      release_notes: ${{ steps.semver-action.outputs.release_notes }}
    steps:
      - uses: actions/checkout@v4
      - name: Run Semver
        uses: builder555/SimpleSemver@master
```
