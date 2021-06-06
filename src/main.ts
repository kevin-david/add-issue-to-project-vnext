import * as core from '@actions/core'
import {inspect} from 'util';
import {graphql} from '@octokit/graphql';
import * as fetch from 'node-fetch';

// Query to get the Relay ID of the Project vNext
const getProjectNextQuery = (organization, projectNextNumber) => {
  return `{
    organization(login: "${organization}") {
      projectNext(number: ${projectNextNumber}) {
        id
      }
    }
  }`
};

// Query to get the Relay ID of the Issue
const getIssue = (repoOwner, repoName, issueId) => {
  return `{
    repositoryOwner(login: "${repoOwner}") {
      repository(name: "${repoName}") {
        issue(number: ${issueId}) {
          id
        }
      }
    }
  }`
};

// Mutation to add the issue to the Project vNext
const addIssueToProjectNext = (contentId, projectId) => {
  return `mutation {
    addProjectNextItem(input: {contentId: "${contentId}", projectId: "${projectId}"}) {
      projectNextItem {
        id
      }
    }
  }`
};

async function run(): Promise<void> {
  try {
    const issueId = core.getInput('issue-id');
    const organization = core.getInput('organization');
    const projectNextNumber = core.getInput('project-next-id');
    
    const headers = {
      // Supply the feature flag as a header.
      'GraphQL-Features': 'projects_next_graphql',
      Authorization: `Bearer ${process.env.PAT_TOKEN || process.env.GITHUB_TOKEN}`
    };

    const graphqlExecutor = graphql.defaults({
      baseUrl,
      headers
    });

    const projectData = await graphqlExecutor(getProjectNextQuery(organization, projectNextNumber));
    const projectId = projectData.organization.projectNext.id;

    const issueData = await graphqlExecutor(getIssue(repoOwner, repoName, issueId));
    const issueId = issueData.repositoryOwner.repository.issue.id;

    await graphqlExecutor(addIssueToProjectNext(issueId, projectId));

    core.info('Issue was added to Project vNext successfully');
    core.setOutput('success', true);
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
