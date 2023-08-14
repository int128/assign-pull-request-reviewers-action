import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  await run({
    labelPrefix: core.getInput('label-prefix', { required: true }),
    token: core.getInput('token', { required: true }),
  })
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
