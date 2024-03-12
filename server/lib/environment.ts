import * as fs from 'fs';
import LocalStorage from './local/storage';
import LocalTasks from './local/tasks';
import {CloudTasksClient} from '@google-cloud/tasks';
import {Datastore} from '@google-cloud/datastore';
import {DocumentProcessorServiceClient} from '@google-cloud/documentai';
import {Storage} from '@google-cloud/storage';
import {existsSync, readFileSync} from 'fs';

function readFile(filename: string, fallback: string) {
  return existsSync(filename) ? readFileSync(filename, 'utf-8') : fallback;
}

type Environment = 'local' | 'prod' | 'staging';
export let env: Environment = 'local';
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (projectId) {
  if (projectId === JSON.parse(readFile('../infrastructure/outputs/prod/project.json', '{}')).id) {
    env = 'prod';
  } else if (projectId === JSON.parse(readFile('../infrastructure/outputs/staging/project.json', '{}')).id) {
    env = 'staging';
  }
}

export let bucket: string,
  datastore: Datastore,
  documentAI: DocumentProcessorServiceClient,
  documentAIFormProcessor: string,
  idProofingProcessor: string,
  queuePath: string,
  statusCheck: {path: string; content: string},
  storage: Storage,
  tasks: CloudTasksClient;

if (process.env.NODE_ENV === 'production') {
  bucket = JSON.parse(fs.readFileSync(`../infrastructure/outputs/${env}/storage.json`, 'utf8')).bucket;
  datastore = new Datastore({projectId: projectId});
  documentAI = new DocumentProcessorServiceClient();
  const documentAIProcessors = JSON.parse(
    fs.readFileSync(`../infrastructure/outputs/${env}/documentAI.json`, 'utf8'),
  );
  documentAIFormProcessor = documentAIProcessors.formProcessor;
  idProofingProcessor = documentAIProcessors.idProofingProcessor;
  storage = new Storage();
  tasks = new CloudTasksClient();
  const {name: queueName, location: queueLocation} = JSON.parse(
    fs.readFileSync(`../infrastructure/outputs/${env}/taskQueue.json`, 'utf8'),
  );
  queuePath = tasks.queuePath(projectId!, queueLocation, queueName);
  statusCheck = JSON.parse(fs.readFileSync(`../infrastructure/outputs/${env}/statusCheck.json`, 'utf8'));
} else {
  bucket = 'bucket';
  const LocalDatastore = require('./local/datastore').default;
  datastore = new LocalDatastore('.local/datastore.sqlite3') as any as Datastore;
  documentAI = new DocumentProcessorServiceClient();
  const documentAIProcessors = JSON.parse(
    fs.readFileSync(`../infrastructure/outputs/staging/documentAI.json`, 'utf8'),
  );
  documentAIFormProcessor = documentAIProcessors.formProcessor;
  idProofingProcessor = documentAIProcessors.idProofingProcessor;
  storage = new LocalStorage('.local/storage/') as any as Storage;
  tasks = new LocalTasks() as any as CloudTasksClient;
  queuePath = 'queue';
  statusCheck = {path: '/status', content: 'OK'};
}
