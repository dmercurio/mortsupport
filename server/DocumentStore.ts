import {AnyoneCanView} from './lib/viewpolicy';
import {Model, Store} from './lib/model';
import {secureRandomId} from './lib/ids';

export type DocumentStatus = 'WAITING' | 'VERIFYING' | 'SUCCESS' | 'FAILURE';

export class Document extends Model {
  id: string = secureRandomId();
  name!: string;
  birthdate!: string;
  ssnLast4?: string;
  status?: DocumentStatus = 'WAITING';
  fields?: Record<string, string> = {};
}
export const DocumentStore = Store<Document>(Document, 'documents', AnyoneCanView);
