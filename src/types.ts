import * as github from '@actions/github'
import { Endpoints } from '@octokit/types'

export type Octokit = ReturnType<typeof github.getOctokit>

export type Repository = {
  owner: string
  repo: string
}

type PullRequests = Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data']
export type PullRequest = PullRequests[number]
