import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import {appEngineApp, projectId} from "./index";

const gcpConfig = new pulumi.Config('gcp');

new gcp.projects.Service('iamcredentials.googleapis.com', {
  project: projectId,
  service: 'iamcredentials.googleapis.com',
});

new gcp.projects.IAMMember('service-account-creator', {
  project: projectId,
  member: `serviceAccount:${gcpConfig.require('impersonateServiceAccount')}`,
  role: 'roles/iam.serviceAccountCreator',
});

// give the necessary permissions to the App Engine default service account
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
  }, {dependsOn: [appEngineApp]});
});

// remove the editor role from everyone
new gcp.projects.IAMBinding('remove-editor-role-members', {
  project: projectId,
  members: [],
  role: 'roles/editor',
});
