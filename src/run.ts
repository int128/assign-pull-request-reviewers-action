import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit, PullRequest } from './types'

type Inputs = {
  labelPrefix: string
  token: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  const octokit = github.getOctokit(inputs.token)

  const { data: pulls } = await octokit.rest.pulls.list({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: 'all',
    sort: 'created',
    direction: 'desc',
    per_page: 100,
  })
  pulls.reverse()
  core.info(`Found pull requests ${pulls.map((pull) => `#${pull.number}`).join()}`)

  core.info(`Compute the pull request groups`)
  const groups = computePullRequestGroups(pulls, inputs.labelPrefix)
  const reviewGroups = computePullRequestReviewGroups(groups)
  for (const group of reviewGroups) {
    core.info(`labels(${group.labels.join()}) => ${group.pulls.map((pull) => `#${pull.number}`).join()}`)
  }

  core.info(`Write to dashboard`)
  const dashboard = formatDashboard(reviewGroups)
  await createOrUpdateDashboard(octokit, dashboard)

  core.info(`Reconcile reviewers`)
  for (const group of reviewGroups) {
    for (const pull of group.pulls) {
      if (pull.state !== 'open') {
        core.info(`#${pull.number}: state is ${pull.state}, skip`)
        continue
      }
      const currentReviewers = new Set(extractReviewerUsers(pull))
      const alreadyRequested = group.reviewers.every((r) => currentReviewers.has(r))
      if (alreadyRequested) {
        core.info(`#${pull.number}: already review-requested, skip`)
        continue
      }
      core.info(`#${pull.number}: requesting a review by ${group.reviewers.map((r) => `@${r}`).join()}`)
      await octokit.rest.pulls.requestReviewers({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: pull.number,
        reviewers: group.reviewers,
      })
    }
  }
}

const formatDashboard = (groups: PullRequestReviewGroup[]): string => {
  const lines: string[] = []
  lines.push(`\
This is automatically generated by assign-issues-action.

## Pull request groups
`)
  if (groups.length === 0) {
    lines.push(`Nothing.`)
  }
  for (const group of groups) {
    lines.push(`\
### ${group.labels.join(', ')}
These pull requests are reviewed by ${group.reviewers.map((r) => `@${r}`).join(' ')}.

`)
    for (const pull of group.pulls) {
      lines.push(`- #${pull.number}`)
    }
  }
  return lines.join('\n')
}

const createOrUpdateDashboard = async (octokit: Octokit, body: string) => {
  const keyLabel = 'pull-request-review-dashboard'
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    labels: keyLabel,
    per_page: 1,
    sort: 'created',
    direction: 'asc',
  })
  const issue = issues.pop()
  if (issue) {
    core.info(`Updating the issue #${issue.number}`)
    return await octokit.rest.issues.update({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issue.number,
      title: 'Pull Request Review Dashboard',
      body,
    })
  }
  core.info(`Creating an issue`)
  return await octokit.rest.issues.create({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    title: 'Pull Request Review Dashboard',
    labels: [keyLabel],
    body,
  })
}

type PullRequestGroup = {
  labels: readonly string[]
  pulls: PullRequest[]
}

const computePullRequestGroups = (pulls: PullRequest[], labelPrefix: string): PullRequestGroup[] => {
  const m = new Map<string, PullRequestGroup>()
  for (const pull of pulls) {
    // compute the group key
    const labels: string[] = []
    for (const label of pull.labels) {
      if (typeof label !== 'object') {
        continue
      }
      if (!label.name?.startsWith(labelPrefix)) {
        continue
      }
      labels.push(label.name)
    }
    if (labels.length < 1) {
      continue
    }

    // add to the group
    const k = labels.join()
    let group = m.get(k)
    if (group === undefined) {
      group = { labels, pulls: [] }
      m.set(k, group)
    }
    group.pulls.push(pull)
  }
  return [...m.values()]
}

type PullRequestReviewGroup = PullRequestGroup & {
  reviewers: string[]
}

const computePullRequestReviewGroups = (groups: PullRequestGroup[]): PullRequestReviewGroup[] => {
  const reviewGroups: PullRequestReviewGroup[] = []
  for (const group of groups) {
    if (!group.pulls.some((pull) => pull.state === 'open')) {
      continue
    }
    const reviewers = computePullRequestReviewers(group)
    if (reviewers.length === 0) {
      continue
    }
    reviewGroups.push({ ...group, reviewers })
  }
  return reviewGroups
}

const computePullRequestReviewers = (group: PullRequestGroup): string[] => {
  // find the oldest reviewers
  for (const pull of group.pulls) {
    const reviewers = extractReviewerUsers(pull)
    if (reviewers.length > 0) {
      return reviewers
    }
  }
  return []
}

const extractReviewerUsers = (pull: PullRequest): string[] =>
  pull.requested_reviewers?.filter((reviewer) => reviewer.type === 'User').map((reviewer) => reviewer.login) ?? []
