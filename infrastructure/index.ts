import * as fs from 'fs';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import * as time from '@pulumiverse/time';

const config = new pulumi.Config();
const gcpConfig = new pulumi.Config('gcp');
const stack = pulumi.getStack();


/* Google Project */

export let projectId: pulumi.Output<string>;
if (gcpConfig.get('project')) {
  projectId = pulumi.Output.create(gcpConfig.require('project'));
} else {
  const randomId = new random.RandomString('random', {length: 4, minNumeric: 4});
  const project = new gcp.organizations.Project("MortSupport", {
    name: `MortSupport ${stack === 'staging' ? 'Staging' : stack === 'prod' ? 'Prod' : stack}`,
    billingAccount: config.require('billingAccount'),
    folderId: config.require('folderId'),
    projectId: randomId.result.apply((id) => `mortsupport-staging-${id}`),
  });
  projectId = project.projectId;
}
projectId.apply((id) => {
  fs.mkdirSync(`outputs/${stack}`, {recursive: true});
  fs.writeFileSync(`outputs/${stack}/project_id.txt`, id);
});


/* App Engine */

// Service APIs
const googleApis = [
  'appengine.googleapis.com',
  'cloudbuild.googleapis.com', // for deployments
  'cloudtasks.googleapis.com',
  'datastore.googleapis.com',
  'monitoring.googleapis.com',
  'secretmanager.googleapis.com',
].map((googleApi) => (
  new gcp.projects.Service(googleApi, {
    project: projectId,
    service: googleApi,
  })
));

// App Engine Application
const appEngineApp = new gcp.appengine.Application('app-engine-application', {
  databaseType: 'CLOUD_DATASTORE_COMPATIBILITY',
  project: projectId,
  locationId: config.require('location'),
});
export const appEngineHostname = appEngineApp.defaultHostname;

// App Engine Bucket
const appEngineBucket = new gcp.storage.Bucket('app-engine-bucket', {
  location: config.require('location'),
  name: projectId.apply((id) => `${id}-bucket`),
  project: projectId,
  publicAccessPrevention: 'enforced',
});
export const appEngineBucketName = appEngineBucket.name;

// Datastore Backups Bucket
const datastoreBackupBucket = new gcp.storage.Bucket('datastore-backup-bucket', {
  lifecycleRules: [{
    action: {type: 'Delete'}, condition: {age: 100},
  }],
  location: config.require('location'),
  name: projectId.apply((id) => `${id}-datastore-backups`),
  project: projectId,
  publicAccessPrevention: 'enforced',
  storageClass: 'COLDLINE',
});
export const datastoreBackupBucketName = datastoreBackupBucket.name;

// Cloud Tasks Queue
const taskQueueDelay = new time.Sleep('task-queue-delay', {
  createDuration: "60s", // work around a Google issue
}, {dependsOn: [...googleApis, appEngineApp]});
new gcp.cloudtasks.Queue('cloud-tasks-queue', {
  location: config.require('location'),
  name: projectId.apply((id) => `${id}-queue`),
  project: projectId,
}, {dependsOn: taskQueueDelay});

// Status Check
new gcp.monitoring.UptimeCheckConfig('status-check', {
  contentMatchers: [{
    content: 'OK',
  }],
  displayName: 'Status Check',
  httpCheck: {
    path: '/status',
    useSsl: true,
    validateSsl: true,
  },
  monitoredResource: {
    type: 'uptime_url',
    labels: {
      host: appEngineHostname,
      project_id: projectId,
    },
  },
  period: '900s',
  project: projectId,
  selectedRegions: ['USA'],
  timeout: '30s',
}, {dependsOn: googleApis});
