import * as core from '@actions/core'
import { createOrUpdateIssueBody, createOrUpdateIssueComment } from './issue.js'
import { PullRequestGroup } from './group.js'
import { Octokit, Repository } from './types.js'
import { formatComment, formatDashboard } from './format.js'

export const reconcile = async (octokit: Octokit, repo: Repository, groups: PullRequestGroup[]) => {
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
    }
  }
}
