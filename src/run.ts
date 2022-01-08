import * as core from '@actions/core'
import * as github from '@actions/github'
import { createOrUpdateDashboard, formatDashboard } from './dashboard'
import { computePullRequestGroups, computePullRequestReviewGroups } from './group'
import { reconcile } from './reconcile'

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

  const groups = computePullRequestGroups(pulls, inputs.labelPrefix)
  const reviewGroups = computePullRequestReviewGroups(groups)

  core.info(`Pull request groups:`)
  for (const group of reviewGroups) {
    core.info(`* labels(${group.labels.join()}) => ${group.pulls.map((pull) => `#${pull.number}`).join()}`)
  }

  const dashboard = formatDashboard(reviewGroups)
  core.info(`Review dashboard:\n----\n${dashboard}\n----`)
  core.info(`Writing to issue`)
  await createOrUpdateDashboard(octokit, github.context.repo, dashboard)

  core.info(`Reconciling pull request reviewers`)
  await reconcile(octokit, github.context.repo, reviewGroups)
}
