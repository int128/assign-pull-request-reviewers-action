# group-pull-request-action [![ts](https://github.com/int128/group-pull-request-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/group-pull-request-action/actions/workflows/ts.yaml)

This is an action to notify the pull request group.

## Getting Started with Renovate

### Problem to solve

Let us think a directory structure of monorepo, for example,

```
.
├── renovate.json5
└── components
    ├── foo
    │   └── package.json
    └── bar
        └── package.json
```

### How to use

Set up Renovate with `renovate.json5`.

```json5
{
  extends: ['config:base'],
  labels: ['renovate/{{depName}}'],
  reviewers: ['team:YOUR-TEAM'],
  packageRules: [
    {
      description: 'Update dependencies per component',
      matchFileNames: ['components/**'],
      additionalBranchPrefix: '{{packageFileDir}}-',
      commitMessageSuffix: '({{packageFileDir}})',
    },
  ],
}
```

Renovate will create a pull request with a label of dependency name such as `renovate/@types/node`.
It will create a pull request for each component such as `components/foo/package.json`.

Create a workflow.

```yaml
name: group-pull-request-by-renovate-label

on:
  pull_request:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: int128/group-pull-request-action@v2
        with:
          label-prefix: renovate/
```

### What this action does

If the following pull requests are open,

- Pull request #1 has a label `renovate/@types/node` and is reviewed by `@foo`
- Pull request #2 has a label `renovate/@types/node` and is reviewed by `@bar`
- Pull request #3 has a label `renovate/@types/node` and is reviewed by `@baz`

This action will create an issue of the review dashboard.
See [an example](https://github.com/int128/group-pull-request-action/issues/9).

![image](https://user-images.githubusercontent.com/321266/148638925-a9fc4109-6511-4baa-9304-777758efea96.png)

## Inputs

| Name           | Default        | Description               |
| -------------- | -------------- | ------------------------- |
| `label-prefix` | (required)     | Prefix of label to filter |
| `token`        | `github.token` | GitHub token              |

## Outputs

No output.
