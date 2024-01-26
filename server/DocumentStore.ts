import {AnyoneCanView} from './lib/viewpolicy';
import {Model, Store} from './lib/model';
import {secureRandomId} from './lib/ids';

export class Document extends Model {
  id: string = secureRandomId();
  complete?: number = 0;
  verified?: number = 0;
}
export const DocumentStore = Store<Document>(Document, 'documents', AnyoneCanView);
