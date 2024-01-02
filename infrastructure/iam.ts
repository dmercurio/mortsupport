import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as time from '@pulumiverse/time';
import {appEngineApp} from './app_engine';
import {projectId} from './project';

const gcpConfig = new pulumi.Config('gcp');

new gcp.projects.Service('iamcredentials.googleapis.com', {
  project: projectId,
  service: 'iamcredentials.googleapis.com',
});

export const serviceAccountCreator = new gcp.projects.IAMMember('service-account-creator', {
  project: projectId,
  member: `serviceAccount:${gcpConfig.require('impersonateServiceAccount')}`,
  role: 'roles/iam.serviceAccountCreator',
});

// give the necessary permissions to the App Engine default service account
const appEngineAppDelay = new time.Sleep('app-engine-app-delay', {
  createDuration: '60s', // give extra time for default service account creation
}, {dependsOn: appEngineApp});
[
  'roles/appengine.serviceAgent',
  'roles/datastore.user',
  'roles/monitoring.metricWriter',
  'roles/secretmanager.admin',
  'roles/cloudtasks.enqueuer',
  'roles/storage.objectViewer',
  'roles/storage.objectCreator',
  'roles/datastore.importExportAdmin',
].forEach((role) => {
  new gcp.projects.IAMMember(role, {
    project: projectId,
    member: projectId.apply((id) => `serviceAccount:${id}@appspot.gserviceaccount.com`),
    role: role,
  }, {dependsOn: [appEngineAppDelay, serviceAccountCreator]});
});

// remove the editor role from everyone
new gcp.projects.IAMBinding('remove-editor-role-members', {
  project: projectId,
  members: [],
  role: 'roles/editor',
});
