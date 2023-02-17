import * as core from '@actions/core'
import { createOrUpdateComment } from './comment'
import { extractReviewerUsers, PullRequestReviewGroup } from './group'
import { Octokit, PullRequest, Repository } from './types'

export const reconcile = async (octokit: Octokit, repo: Repository, groups: PullRequestReviewGroup[]) => {
  for (const group of groups) {
    const comment = [`## Related pull requests (${group.labels.join(', ')})`]
    for (const pull of group.pulls) {
      comment.push(`- #${pull.number}`)
    }

    for (const pull of group.pulls) {
      if (pull.state !== 'open') {
        core.info(`#${pull.number}: state is ${pull.state}, skip`)
        continue
      }

      await createOrUpdateComment(octokit, repo, pull.number, comment.join('\n'))
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
