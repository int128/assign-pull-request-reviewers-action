import * as core from '@actions/core'
import { Octokit, Repository } from './types.js'

export const createOrUpdateIssueComment = async (
  octokit: Octokit,
  repository: Repository,
  issueNumber: number,
  body: string,
) => {
  const commentKey = `<!-- assign-pull-request-reviewers-action -->`

  core.info(`#${issueNumber}: finding key ${commentKey}`)
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: repository.owner,
    repo: repository.repo,
    issue_number: issueNumber,
    sort: 'created',
    direction: 'desc',
    per_page: 100,
  })
  core.info(`#${issueNumber}: found ${comments.length} comment(s)`)
  for (const comment of comments) {
    if (comment.body?.includes(commentKey)) {
      core.info(`#${issueNumber}: updating the comment ${comment.html_url}`)
      const { data: updated } = await octokit.rest.issues.updateComment({
        owner: repository.owner,
        repo: repository.repo,
        comment_id: comment.id,
        body: `${body}\n${commentKey}`,
      })
      core.info(`#${issueNumber}: updated the comment ${updated.html_url}`)
      return
    }
  }

  core.info(`#${issueNumber}: creating a comment`)
  const { data: created } = await octokit.rest.issues.createComment({
    owner: repository.owner,
    repo: repository.repo,
    issue_number: issueNumber,
    body: `${body}\n${commentKey}`,
  })
  core.info(`#${issueNumber}: created a comment as ${created.html_url}`)
}

export const createOrUpdateIssueBody = async (octokit: Octokit, repo: Repository, issueLabel: string, body: string) => {
  const { data: issues } = await octokit.rest.issues.listForRepo({
    ...repo,
    labels: issueLabel,
    per_page: 1,
    sort: 'created',
    direction: 'asc',
  })
  const issue = issues.pop()
  if (issue) {
    core.info(`Updating the issue #${issue.number}`)
    await octokit.rest.issues.update({
      ...repo,
      issue_number: issue.number,
      title: 'Pull Request Review Dashboard',
      body,
    })
    return
  }
  core.info(`Creating an issue`)
  await octokit.rest.issues.create({
    ...repo,
    title: 'Pull Request Review Dashboard',
    labels: [issueLabel],
    body,
  })
}
