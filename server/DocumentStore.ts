import {AnyoneCanView} from './lib/viewpolicy';
import {Model, Store} from './lib/model';
import {secureRandomId} from './lib/ids';

export class Document extends Model {
  id: string = secureRandomId();
  status?: 'WAITING' | 'VERIFYING' | 'SUCCESS' | 'FAILURE' = 'WAITING';
}
export const DocumentStore = Store<Document>(Document, 'documents', AnyoneCanView);
