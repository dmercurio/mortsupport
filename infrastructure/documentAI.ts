import * as fs from 'fs';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import {projectId} from './project';

const config = new pulumi.Config();
const stack = pulumi.getStack();

/* Document AI */

new gcp.projects.Service('documentai.googleapis.com', {
  project: projectId,
  service: 'documentai.googleapis.com',
});

export const formProcessor = new gcp.essentialcontacts.DocumentAiProcessor('formProcessor', {
  displayName: 'formProcessor',
  location: config.require('documentAILocation'),
  project: projectId,
  type: 'FORM_PARSER_PROCESSOR',
});
formProcessor.id.apply((id) => {
  fs.mkdirSync(`outputs/${stack}`, {recursive: true});
  fs.writeFileSync(`outputs/${stack}/documentAI.json`, JSON.stringify({formProcessor: id}));
});
