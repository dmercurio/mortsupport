import * as fs from 'fs';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as time from '@pulumiverse/time';
import {projectId} from './project';

const config = new pulumi.Config();
const stack = pulumi.getStack();

/* App Engine */

// Service APIs
const googleApis = [
  'appengine.googleapis.com',
  'cloudbuild.googleapis.com', // for deployments
  'cloudtasks.googleapis.com',
  'datastore.googleapis.com',
  'monitoring.googleapis.com',
  'secretmanager.googleapis.com',
].map(
  (googleApi) =>
    new gcp.projects.Service(googleApi, {
      project: projectId,
      service: googleApi,
    }),
);

// App Engine Application
export const appEngineApp = new gcp.appengine.Application('app-engine-application', {
  databaseType: 'CLOUD_DATASTORE_COMPATIBILITY',
  project: projectId,
  locationId: config.require('location'),
});
export const appEngineHostname = appEngineApp.defaultHostname;

// App Engine Bucket
const appEngineBucket = new gcp.storage.Bucket('app-engine-bucket', {
  // view cors using: gcloud storage buckets describe gs://BUCKET --format="default(cors_config)"
  cors: [{
    maxAgeSeconds: 3600,
    methods: ['PUT'],
    origins: [appEngineHostname.apply((hostname) => `https://${hostname}`)],
    responseHeaders: ['Content-Type'],
  }],
  location: config.require('location'),
  name: projectId.apply((id) => `${id}-bucket`),
  project: projectId,
  publicAccessPrevention: 'enforced',
});
export const appEngineBucketName = appEngineBucket.name;

// Datastore Backups Bucket
const datastoreBackupBucket = new gcp.storage.Bucket('datastore-backup-bucket', {
  lifecycleRules: [
    {
      action: {type: 'Delete'},
      condition: {age: 100},
    },
  ],
  location: config.require('location'),
  name: projectId.apply((id) => `${id}-datastore-backups`),
  project: projectId,
  publicAccessPrevention: 'enforced',
  storageClass: 'COLDLINE',
});
export const datastoreBackupBucketName = datastoreBackupBucket.name;

// Cloud Tasks Queue
const taskQueueDelay = new time.Sleep(
  'task-queue-delay',
  {
    createDuration: '60s', // work around a Google issue
  },
  {dependsOn: [...googleApis, appEngineApp]},
);
new gcp.cloudtasks.Queue(
  'cloud-tasks-queue',
  {
    location: config.require('location'),
    name: projectId.apply((id) => `${id}-queue`),
    project: projectId,
  },
  {dependsOn: taskQueueDelay},
);

// Status Check
const statusCheck = new gcp.monitoring.UptimeCheckConfig(
  'status-check',
  {
    contentMatchers: [
      {
        content: 'OK',
      },
    ],
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
  },
  {dependsOn: googleApis},
);
pulumi
  .all([statusCheck.contentMatchers, statusCheck.monitoredResource, statusCheck.httpCheck])
  .apply(([contentMatchers, monitoredResource, httpCheck]) => {
    fs.mkdirSync(`outputs/${stack}`, {recursive: true});
    fs.writeFileSync(
      `outputs/${stack}/statusCheck.json`,
      JSON.stringify({
        content: contentMatchers?.at(0)?.content,
        host: monitoredResource?.labels.host,
        path: httpCheck?.path,
      }),
    );
  });
