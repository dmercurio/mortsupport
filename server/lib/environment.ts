import LocalStorage from './local/storage';

import {Storage} from '@google-cloud/storage';


export let storage: Storage;
if (process.env.NODE_ENV === 'production') {
  storage = new Storage();
} else {
  storage = (new LocalStorage('.local/storage/') as any) as Storage;
}
