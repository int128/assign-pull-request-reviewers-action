import * as core from '@actions/core'
import * as github from '@actions/github'
import { computePullRequestGroups } from './group.js'
import { reconcile } from './reconcile.js'

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
  core.info(`Pull request groups:`)
  for (const group of groups) {
    core.info(`* labels(${group.labels.join()}) => ${group.pulls.map((pull) => `#${pull.number}`).join()}`)
  }

  await reconcile(octokit, github.context.repo, groups)
}
