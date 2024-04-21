import { PullRequest } from './types.js'

export type PullRequestGroup = {
  labels: readonly string[]
  pulls: PullRequest[]
}

export const computePullRequestGroups = (pulls: PullRequest[], labelPrefix: string): PullRequestGroup[] => {
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

export type PullRequestReviewGroup = PullRequestGroup & {
  reviewers: string[]
}

export const computePullRequestReviewGroups = (groups: PullRequestGroup[]): PullRequestReviewGroup[] => {
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

export const extractReviewerUsers = (pull: PullRequest): string[] =>
  pull.requested_reviewers?.filter((reviewer) => reviewer.type === 'User').map((reviewer) => reviewer.login) ?? []
