import {AnyoneCanView} from './lib/viewpolicy';
import {Model, Store, pii} from './lib/model';
import {secureRandomId} from './lib/ids';

export type DocumentStatus = 'WAITING' | 'VERIFYING' | 'SUCCESS' | 'FAILURE';

export class Document extends Model {
  id: string = secureRandomId();
  filename?: string;
  @pii name!: string;
  @pii birthdate!: string;
  @pii deathdate!: string;
  @pii ssnLast4?: string;
  status?: DocumentStatus = 'WAITING';
  statusMessage?: string;
  @pii fields?: Record<string, string> = {};
  mimetype?: string;
}
export const DocumentStore = Store<Document>(Document, 'documents', AnyoneCanView);
