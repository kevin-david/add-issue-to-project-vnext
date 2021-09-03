import * as core from '@actions/core'
//import {inspect} from 'util'
import {graphql} from '@octokit/graphql'

type TGetProjectNextQuery = {
  organization: {
    projectNext: {
      id: string
    }
  }
}
const getProjectNextQuery = (
  organization: string,
  projectNextNumber: number
): string => {
  return `{
    organization(login: "${organization}") {
      projectNext(number: ${projectNextNumber}) {
        id
      }
    }
  }`
}

type TGetIssue = {
  repositoryOwner: {
    repository: {
      issue: {
        id: string
      }
    }
  }
}
const getIssue = (
  repoOwner: string,
  repoName: string,
  issueNumber: number
): string => {
  return `{
    repositoryOwner(login: "${repoOwner}") {
      repository(name: "${repoName}") {
        issue(number: ${issueNumber}) {
          id
        }
      }
    }
  }`
}

// Mutation to add the issue to the Project vNext
const addIssueToProjectNext = (issueId: string, projectId: string): string => {
  return `mutation {
    addProjectNextItem(input: {contentId: "${issueId}", projectId: "${projectId}"}) {
      projectNextItem {
        id
      }
    }
  }`
}

async function run(): Promise<void> {
  try {
    const baseUrl = process.env.GRAPHQL_API_BASE || 'https://api.github.com'
    const token = process.env.PAT_TOKEN || process.env.GITHUB_TOKEN

    const issueNumber = parseInt(core.getInput('issue-id'))
    const organization = core.getInput('organization')
    const projectNextNumber = parseInt(core.getInput('project-next-id'))
    const repoName = core.getInput('repo-name')
    const repoOwner = core.getInput('repo-owner')

    const headers = {
      // Supply the feature flag as a header.
      'GraphQL-Features': 'projects_next_graphql',
      Authorization: `Bearer ${token}`
    }

    const graphqlExecutor = graphql.defaults({
      baseUrl,
      headers
    })

    const projectData = await graphqlExecutor<TGetProjectNextQuery>(
      getProjectNextQuery(organization, projectNextNumber)
    )
    const projectId = projectData.organization.projectNext.id

    core.info(`Requesting issue ${issueNumber} in ${repoOwner}/${repoName}`)
    const issueData = await graphqlExecutor<TGetIssue>(
      getIssue(repoOwner, repoName, issueNumber)
    )

    core.info(`Result: ${JSON.stringify(issueData)}`)

    const issueId = issueData.repositoryOwner.repository.issue.id

    await graphqlExecutor(addIssueToProjectNext(issueId, projectId))

    core.info('Issue was added to Project vNext successfully')
    core.setOutput('success', true)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
