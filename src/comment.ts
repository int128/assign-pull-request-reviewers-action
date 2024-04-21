import * as core from '@actions/core'
import { Octokit, Repository } from './types.js'

export const createOrUpdateComment = async (
  octokit: Octokit,
  repository: Repository,
  pullNumber: number,
  body: string,
) => {
  const commentKey = `<!-- assign-pull-request-reviewers-action -->`

  core.info(`#${pullNumber}: finding key ${commentKey}`)
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: repository.owner,
    repo: repository.repo,
    issue_number: pullNumber,
    sort: 'created',
    direction: 'desc',
    per_page: 100,
  })
  core.info(`#${pullNumber}: found ${comments.length} comment(s)`)
  for (const comment of comments) {
    if (comment.body?.includes(commentKey)) {
      core.info(`#${pullNumber}: updating the comment ${comment.html_url}`)
      const { data: updated } = await octokit.rest.issues.updateComment({
        owner: repository.owner,
        repo: repository.repo,
        comment_id: comment.id,
        body: `${body}\n${commentKey}`,
      })
      core.info(`#${pullNumber}: updated the comment ${updated.html_url}`)
      return
    }
  }

  core.info(`#${pullNumber}: creating a comment`)
  const { data: created } = await octokit.rest.issues.createComment({
    owner: repository.owner,
    repo: repository.repo,
    issue_number: pullNumber,
    body: `${body}\n${commentKey}`,
  })
  core.info(`#${pullNumber}: created a comment as ${created.html_url}`)
}
