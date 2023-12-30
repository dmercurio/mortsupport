import * as fs from 'fs';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as time from '@pulumiverse/time';
import {appEngineApp} from './app_engine';
import {projectId} from './index';
import {serviceAccountCreator} from './iam';

const config = new pulumi.Config();
const stack = pulumi.getStack();

// Github Service Account
const githubServiceAccount = new gcp.serviceaccount.Account('github-service-account', {
  accountId: 'github',
  displayName: 'Github Service Account',
  project: projectId,
}, {dependsOn: serviceAccountCreator});

// Service Account Roles
const appEngineDeployerStorageRole = new gcp.projects.IAMCustomRole('app-engine-deployer-storage', {
  description: 'Storage permissions required to deploy App Engine',
  permissions: ['storage.objects.create', 'storage.objects.list'],
  project: projectId,
  roleId: 'appEngineDeployerStorage',
  title: 'App Engine Deployer Storage',
}, {dependsOn: appEngineApp});
[
  'roles/appengine.deployer',
  'roles/appengine.serviceAdmin',
  'roles/cloudbuild.builds.builder',
  'roles/datastore.indexAdmin',
  'roles/iam.serviceAccountUser',
].map((role) => (
  new gcp.projects.IAMMember(role, {
    member: githubServiceAccount.email.apply((email) => `serviceAccount:${email}`),
    project: projectId,
    role: role,
  })
));
new gcp.projects.IAMMember('app-engine-deployer-storage-role', {
  member: githubServiceAccount.email.apply((email) => `serviceAccount:${email}`),
  project: projectId,
  role: appEngineDeployerStorageRole.id.apply((id) => id),
})

// Workload Identity Pool
const workloadIdentityPoolDelay = new time.Sleep('workload-identity-pool-delay', {
  createDuration: '60s', // work around a Google issue
}, {dependsOn: appEngineApp});
const workloadIdentityPool = new gcp.iam.WorkloadIdentityPool('workload-identity-pool', {
  displayName: 'Github Workload Identity Pool',
  project: projectId,
  workloadIdentityPoolId: 'github-pool',
}, {dependsOn: workloadIdentityPoolDelay});

// Workload Identity Pool Provider
const workloadIdentityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider('workload-identity-pool-provider', {
  attributeMapping: {
    'attribute.actor': 'assertion.actor',
    'attribute.aud': 'assertion.aud',
    'attribute.repository': 'assertion.repository',
    'google.subject': 'assertion.sub',
  },
  oidc: {
    issuerUri: 'https://token.actions.githubusercontent.com',
  },
  project: projectId,
  workloadIdentityPoolId: workloadIdentityPool.workloadIdentityPoolId,
  workloadIdentityPoolProviderId: 'github-pool-provider',
});

// Workload Identity User Role
new gcp.serviceaccount.IAMMember('workload-identity-user', {
  role: 'roles/iam.workloadIdentityUser',
  member: workloadIdentityPool.name.apply(
    (name) => `principalSet://iam.googleapis.com/${name}/attribute.repository/${config.require('githubRepository')}`
  ),
  serviceAccountId: githubServiceAccount.id,
})

pulumi.all([workloadIdentityPoolProvider.name, githubServiceAccount.email]).apply(([poolProvider, serviceAccount]) => {
  fs.mkdirSync(`outputs/${stack}`, {recursive: true});
  fs.writeFileSync(`outputs/${stack}/github.json`, JSON.stringify({
    poolProvider: poolProvider,
    serviceAccount: serviceAccount,
  }));
});
