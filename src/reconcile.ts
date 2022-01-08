import * as core from '@actions/core'
import { extractReviewerUsers, PullRequestReviewGroup } from './group'
import { Octokit, Repository } from './types'

export const reconcile = async (octokit: Octokit, repo: Repository, groups: PullRequestReviewGroup[]) => {
  for (const group of groups) {
    for (const pull of group.pulls) {
      if (pull.state !== 'open') {
        core.info(`#${pull.number}: state is ${pull.state}, skip`)
        continue
      }
      const currentReviewers = new Set(extractReviewerUsers(pull))
      const alreadyRequested = group.reviewers.every((r) => currentReviewers.has(r))
      if (alreadyRequested) {
        core.info(`#${pull.number}: already requested to ${group.reviewers.map((r) => `@${r}`).join()}, skip`)
        continue
      }
      core.info(`#${pull.number}: requesting a review to ${group.reviewers.map((r) => `@${r}`).join()}`)
      await octokit.rest.pulls.requestReviewers({
        ...repo,
        pull_number: pull.number,
        reviewers: group.reviewers,
      })
    }
  }
}
