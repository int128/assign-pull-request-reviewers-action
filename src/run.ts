import * as core from '@actions/core'
import * as github from '@actions/github'
import { PullRequest } from './types'

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

  const pullsByLabels = groupPullRequestsByLabels(pulls, inputs.labelPrefix)
  const desiredStates = computeDesiredStates(pullsByLabels)

  for (const desiredState of desiredStates) {
    core.info(`--`)
    core.info([...desiredState.reviewers].map((r) => `@${r}`).join())
    for (const pull of desiredState.pulls) {
      const currentReviewers = extractReviewerUsers(pull)
      const consistent = [...desiredState.reviewers].every((r) => currentReviewers.has(r))
      core.info(`#${pull.number} (${String(consistent)}) ${[...desiredState.reviewers].map((r) => `@${r}`).join()}`)
    }
  }
}

// for (const pull of pulls) {
//   const currentReviewers = extractReviewerUsers(pull)
//   const consistent = [...desiredReviewers].every((r) => currentReviewers.has(r))
//   if (!consistent) {
//     await octokit.rest.pulls.requestReviewers({
//       owner: github.context.repo.owner,
//       repo: github.context.repo.repo,
//       pull_number: pull.number,
//       reviewers: [...desiredReviewers],
//     })
//   }
// }

const groupPullRequestsByLabels = (pulls: PullRequest[], labelPrefix: string): Map<string, PullRequest[]> => {
  const m = new Map<string, PullRequest[]>()
  for (const pull of pulls) {
    const labels = pull.labels
      .map((label) => {
        if (typeof label !== 'object' || label.name == null) {
          return ''
        }
        if (!label.name.startsWith(labelPrefix)) {
          return ''
        }
        return label.name
      })
      .join()
    if (labels === '') {
      continue
    }

    const labeledPulls = m.get(labels)
    if (labeledPulls === undefined) {
      m.set(labels, [pull])
    } else {
      labeledPulls.push(pull)
    }
  }
  return m
}

type DesiredState = {
  pulls: PullRequest[]
  reviewers: Set<string>
}

const computeDesiredStates = (pullsByLabels: Map<string, PullRequest[]>): DesiredState[] => {
  const states: DesiredState[] = []
  for (const [, pulls] of pullsByLabels) {
    if (pulls.length < 1) {
      continue
    }
    if (!pulls.some((pull) => pull.state === 'open')) {
      continue
    }
    const reviewers = computeReviewers(pulls)
    if (!reviewers) {
      continue
    }
    states.push({ pulls, reviewers })
  }
  return states
}

const computeReviewers = (pulls: PullRequest[]): Set<string> | undefined => {
  for (const pull of pulls) {
    const reviewers = extractReviewerUsers(pull)
    if (reviewers.size > 0) {
      return reviewers
    }
  }
}

const extractReviewerUsers = (pull: PullRequest): Set<string> =>
  new Set(pull.requested_reviewers?.filter((reviewer) => reviewer.type === 'User').map((reviewer) => reviewer.login))
