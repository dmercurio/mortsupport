import {AnyoneCanView} from './lib/viewpolicy';
import {Model, Store} from './lib/model';

export class Document extends Model {
  complete?: number = 0;
}
export const DocumentStore = Store<Document>(Document, 'documents', AnyoneCanView);
