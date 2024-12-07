import * as core from '@actions/core'
import { createOrUpdateIssueBody, createOrUpdateIssueComment } from './issue.js'
import { extractReviewerUsers, PullRequestReviewGroup } from './group.js'
import { Octokit, PullRequest, Repository } from './types.js'
import { formatComment, formatDashboard } from './format.js'

export const reconcile = async (octokit: Octokit, repo: Repository, groups: PullRequestReviewGroup[]) => {
  const dashboard = formatDashboard(groups)
  core.info(`Review dashboard:\n----\n${dashboard}\n----`)
  core.info(`Writing to issue`)
  await createOrUpdateIssueBody(octokit, repo, 'pull-request-review-dashboard', dashboard)

  for (const group of groups) {
    const comment = formatComment(group)
    for (const pull of group.pulls) {
      if (pull.state !== 'open') {
        core.info(`#${pull.number}: state is ${pull.state}, skip`)
        continue
      }

      await createOrUpdateIssueComment(octokit, repo, pull.number, comment)
      await requestReview(octokit, repo, pull, group)
    }
  }
}

const requestReview = async (octokit: Octokit, repo: Repository, pull: PullRequest, group: PullRequestReviewGroup) => {
  const currentReviewers = new Set(extractReviewerUsers(pull))
  const alreadyRequested = group.reviewers.every((r) => currentReviewers.has(r))
  if (alreadyRequested) {
    core.info(`#${pull.number}: already requested to ${group.reviewers.map((r) => `@${r}`).join()}, skip`)
    return
  }
  core.info(`#${pull.number}: requesting a review to ${group.reviewers.map((r) => `@${r}`).join()}`)
  await octokit.rest.pulls.requestReviewers({
    ...repo,
    pull_number: pull.number,
    reviewers: group.reviewers,
  })
}
