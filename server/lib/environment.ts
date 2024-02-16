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

export let storage: Storage, datastore: Datastore, tasks: CloudTasksClient, documentAI: DocumentProcessorServiceClient;
if (process.env.NODE_ENV === 'production') {
  datastore = new Datastore({projectId: projectId});
  storage = new Storage();
  tasks = new CloudTasksClient();
  documentAI = new DocumentProcessorServiceClient();
} else {
  const LocalDatastore = require('./local/datastore').default;
  datastore = new LocalDatastore('.local/datastore.sqlite3') as any as Datastore;
  storage = new LocalStorage('.local/storage/') as any as Storage;
  tasks = new LocalTasks() as any as CloudTasksClient;
}
