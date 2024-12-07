# assign-pull-request-reviewers-action [![ts](https://github.com/int128/assign-pull-request-reviewers-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/assign-pull-request-reviewers-action/actions/workflows/ts.yaml)

This is an action to assign reviewers of pull requests by the following rules:

- Assign a reviewer to pull requests which have same labels
- Determine a reviewer from the oldest pull request

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

We would like to update a dependency per component separately, and assign pull requests of same dependency to same reviewer.

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
name: assign-pull-request-reviewers

on:
  pull_request:
    # https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#pull_request
    types:
      - review_requested

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: int128/assign-pull-request-reviewers-action@v1
        with:
          label-prefix: renovate/
```

### What this action does

This action will assign a reviewer as follows:

- Assign a reviewer to pull requests which have same labels
- Determine a reviewer from the oldest pull request

If the following pull requests are open,

- Pull request #1 has a label `renovate/@types/node` and is reviewed by `@foo`
- Pull request #2 has a label `renovate/@types/node` and is reviewed by `@bar`
- Pull request #3 has a label `renovate/@types/node` and is reviewed by `@baz`

this action will request reviews as follows,

- Request a review of #2 to `@foo`
- Request a review of #3 to `@foo`

It will create an issue of the review dashboard.
See [an example](https://github.com/int128/assign-pull-request-reviewers-action/issues/9).

![image](https://user-images.githubusercontent.com/321266/148638925-a9fc4109-6511-4baa-9304-777758efea96.png)

## Inputs

| Name           | Default        | Description               |
| -------------- | -------------- | ------------------------- |
| `label-prefix` | (required)     | Prefix of label to filter |
| `token`        | `github.token` | GitHub token              |

## Outputs

No output.
