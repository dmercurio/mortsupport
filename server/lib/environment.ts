import LocalDatastore from './local/datastore';
import LocalStorage from './local/storage';
import {Datastore} from '@google-cloud/datastore';
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

export let storage: Storage, datastore: Datastore;
if (process.env.NODE_ENV === 'production') {
  datastore = new Datastore({projectId: projectId});
  storage = new Storage();
} else {
  datastore = new LocalDatastore(':memory:') as any as Datastore;
  storage = new LocalStorage('.local/storage/') as any as Storage;
}
