import * as fs from 'fs';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';

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
  fs.writeFileSync(`outputs/${stack}/project.json`, JSON.stringify({id: id}));
});

import './app_engine';
export * from './app_engine';
import './iam';
import './github';
