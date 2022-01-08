import { GitHub } from '@actions/github/lib/utils'
import { Endpoints } from '@octokit/types'

export type Octokit = InstanceType<typeof GitHub>

export type Repository = {
  owner: string
  repo: string
}

type PullRequests = Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data']
export type PullRequest = PullRequests[number]
