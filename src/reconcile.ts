import * as core from '@actions/core'
import { createOrUpdateComment } from './comment.js'
import { extractReviewerUsers, PullRequestReviewGroup } from './group.js'
import { Octokit, PullRequest, Repository } from './types.js'

export const reconcile = async (octokit: Octokit, repo: Repository, groups: PullRequestReviewGroup[]) => {
  for (const group of groups) {
    const comment = formatComment(group)
    for (const pull of group.pulls) {
      if (pull.state !== 'open') {
        core.info(`#${pull.number}: state is ${pull.state}, skip`)
        continue
      }

      await createOrUpdateComment(octokit, repo, pull.number, comment)
      await requestReview(octokit, repo, pull, group)
    }
  }
}

const formatComment = (group: PullRequestReviewGroup) => {
  const lines: string[] = []
  lines.push(`\
## Related pull requests (${group.labels.join(', ')})
These pull requests are reviewed by ${group.reviewers.map((r) => `@${r}`).join(' ')}.

| Pull Request | Merged |
|--------------|--------|`)
  for (const pull of group.pulls) {
    let merged = '-'
    if (pull.merged_at) {
      merged = new Date(pull.merged_at).toISOString().substring(0, 10)
    }
    lines.push(`| <ul><li>#${pull.number}</li></ul> | :white_check_mark: ${merged} |`)
  }
  return lines.join('\n')
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
