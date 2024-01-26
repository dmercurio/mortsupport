import objects from './objects';
import type {Operator} from '@google-cloud/datastore/build/src/query';
import util from 'util';
import {Query, Transaction} from '@google-cloud/datastore';
import {ViewPolicy, ViewRuleResult} from './viewpolicy';
import {datastore} from './environment';
import {uuid} from './ids';

const optionalProps: Map<typeof Model, string[]> = new Map();
const unindexedProps: Map<typeof Model, string[]> = new Map();
const sensitiveProps: Map<typeof Model, string[]> = new Map();
const uniqueProps: Map<typeof Model, string[]> = new Map();

export class Model {
  readonly id: string = uuid();
  readonly created: number = Date.now();
  readonly updated: number = Date.now();

  [util.inspect.custom](depth: number) {
    return (
      this.constructor.name +
      ' ' +
      util.inspect(
        objects.map(this, (k, v) => [
          k,
          sensitiveProps.get(<typeof Model>this.constructor)?.includes(k as string) ? '******' : v,
        ]),
      )
    );
  }
}

/* Property Modifiers */
export function optional<M extends Model>(target: M, name: string): void {
  const propsClass = <typeof Model>target.constructor;
  !optionalProps.has(propsClass) && optionalProps.set(propsClass, []);
  optionalProps.get(propsClass)!.push(name);
}
export function phi<M extends Model>(target: M, name: string): void {
  const propsClass = <typeof Model>target.constructor;
  !unindexedProps.has(propsClass) && unindexedProps.set(propsClass, []);
  unindexedProps.get(propsClass)!.push(name);
  !sensitiveProps.has(propsClass) && sensitiveProps.set(propsClass, []);
  sensitiveProps.get(propsClass)!.push(name);
}
export function sensitive<M extends Model>(target: M, name: string): void {
  const propsClass = <typeof Model>target.constructor;
  !sensitiveProps.has(propsClass) && sensitiveProps.set(propsClass, []);
  sensitiveProps.get(propsClass)!.push(name);
}
export function unindexed<M extends Model>(target: M, name: string): void {
  const propsClass = <typeof Model>target.constructor;
  !unindexedProps.has(propsClass) && unindexedProps.set(propsClass, []);
  unindexedProps.get(propsClass)!.push(name);
}
export function unique<M extends Model>(target: M, name: string): void {
  const propsClass = <typeof Model>target.constructor;
  !uniqueProps.has(propsClass) && uniqueProps.set(propsClass, []);
  uniqueProps.get(propsClass)!.push(name);
}
export function computed<M extends Model, T>(func: (obj: M) => T | Promise<T>) {
  return func as unknown as T;
}

/* Sort Orders */
export const asc = {descending: false};
export const desc = {descending: true};

// https://github.com/piotrwitek/utility-types/blob/df2502ef/src/mapped-types.ts#L94-L111
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;
type MutableKeys<T> = {
  [P in keyof T]-?: IfEquals<{[Q in P]: T[P]}, {-readonly [Q in P]: T[P]}, P>;
}[keyof T];
type Mutable<T> = {[K in MutableKeys<T>]: T[K]};

// https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
type NonFunctionProps<T> = Pick<T, NonFunctionPropertyNames<T>>;

type NonDefaultProps<M extends Model> = Omit<M, 'id' | 'created' | 'updated'>;

export type CreationProps<M extends Model, ExtraProps = {}> = NonFunctionProps<NonDefaultProps<M>> & ExtraProps;

/* Query Parameter Types */
type QueryFilters<M extends Model> = {[K in keyof Partial<M>]: M[K] | [Operator, M[K]] | ['IN' | 'NOT_IN', M[K][]]};
type QueryOrder<M extends Model> = {[K in keyof Partial<M>]: {descending: boolean}}; // TODO allow only one item in the object
type QueryOptions<M extends Model> = {order?: QueryOrder<M> | QueryOrder<M>[]; limit?: number};

export const OmniCtx = Object();

export async function transaction<T>(block: (txn: Transaction) => Promise<T>): Promise<T> {
  const txn = datastore.transaction();
  try {
    await txn.run();
    const returnValue = await block(txn);
    await txn.commit();
    return returnValue;
  } catch (error) {
    await txn.rollback();
    throw error;
  }
}

export function Store<M extends Model, C = {}, ExtraProps = {}>(
  propsClass: typeof Model,
  kind: string,
  viewPolicy: ViewPolicy<C, M>,
) {
  const computed = async (props: Partial<Mutable<M>>): Promise<Record<string, unknown>> => {
    const computedProps = objects.filter(
      objects.map(new propsClass() as {[key: string]: any}, (k, v) => {
        return typeof v === 'function' ? [k, v(props)] : [k, undefined];
      }),
      (k, v) => v !== undefined,
    );
    for (const k in computedProps) {
      computedProps[k] = await computedProps[k]; // TODO Promise.all
    }
    return computedProps;
  };

  const build = async (props: M): Promise<M> => {
    const preComputed = Object.assign(new propsClass(), props);
    return Object.assign(preComputed, await computed(preComputed), props);
  };

  const save = async (obj: M, method: 'insert' | 'upsert' = 'upsert', transaction?: Transaction): Promise<M> => {
    await (transaction || datastore).save({
      key: datastore.key([kind, obj.id]),
      excludeFromIndexes: unindexedProps.get(propsClass) || [],
      data: objects.filter(obj as any, (k, v) => v !== undefined),
      method: method,
    });
    return obj;
  };

  /* TODO still skips properties with non-null assertion operator
  const validate = (obj: DefaultProps & Props): void => {
    const requiredProps = Object.getOwnPropertyNames(obj).filter((k) => !propsClass.optionalProps.includes(k));
    const missingProps = requiredProps.filter((k) => {
      const value = (obj as any)[k];
      return value === null || value === undefined;
    });
    if (missingProps.length > 0) {
      throw new Error(`Missing required properties: ${missingProps.join(',')}`);
    }
  }
  */

  const canView = async (ctx: C, objects: M[]): Promise<boolean> => {
    if (objects.length === 0 || ctx === OmniCtx) {
      return true;
    }
    const results = await Promise.all(viewPolicy.map((rule) => rule(ctx, objects)));
    return results.some((r) => r === ViewRuleResult.ALLOW) && !results.some((r) => r === ViewRuleResult.DENY);
  };

  const create = async (props: CreationProps<M, ExtraProps>): Promise<Readonly<M>> => {
    const obj = await build(props as any);
    if (uniqueProps.get(propsClass)?.length || 0 > 0) {
      const transaction = datastore.transaction();
      try {
        await transaction.run();
        const existingObjects = (
          await Promise.all(
            (uniqueProps.get(propsClass) || []).map((prop) =>
              query(OmniCtx, {[prop]: (obj as any)[prop]} as any, {}, transaction),
            ),
          )
        ).flat();
        if (existingObjects.length === 0) {
          await save(obj, 'insert', transaction);
          await transaction.commit();
          return obj;
        } else {
          throw Error('duplicate value'); // TODO error message/type
        }
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } else {
      return await save(obj, 'insert');
    }
  };

  const load: {
    (ctx: C, id: string, transaction?: Transaction): Promise<Readonly<M>>;
    (ctx: C, ids: string[], transaction?: Transaction): Promise<Readonly<M>[]>;
  } = async (ctx: C, idOrIds: string | string[], transaction?: Transaction) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (ids.length === 0) {
      return [];
    }
    const [datas] = await (transaction || datastore).get(ids.map((id) => datastore.key([kind, id])));
    const objects = await Promise.all(datas.map((data: M) => build(data)));
    if (objects.length === 0 || !(await canView(ctx, objects))) {
      throw Error('Not Found'); // TODO error message/type
    }
    return Array.isArray(idOrIds) ? objects : objects[0];
  };

  const update = async (
    ctx: C,
    id: string,
    props: Partial<Mutable<M>>,
    transaction?: Transaction,
  ): Promise<Readonly<M>> => {
    if ((props as any).id) {
      throw new Error('Cannot reassign id when updating');
    }
    const txn = transaction || datastore.transaction();
    try {
      !transaction && (await txn.run());
      const [loadedProps, computedProps] = await Promise.all([load(ctx, id, txn), computed(props)]);
      const obj = Object.assign(loadedProps, computedProps, props);
      const existingObjects = (
        await Promise.all(
          (uniqueProps.get(propsClass) || []).map((prop) =>
            query(OmniCtx, {[prop]: (obj as any)[prop]} as any, {}, txn),
          ),
        )
      ).flat();
      if (existingObjects.filter((existing) => existing.id != id).length > 0) {
        throw Error('duplicate value'); // TODO error message/type
      }
      await save(obj, 'upsert', txn);
      !transaction && (await txn.commit());
      return obj;
    } catch (error) {
      !transaction && (await txn.rollback());
      throw error;
    }
  };

  const query = async (
    ctx: C,
    filters: QueryFilters<M>,
    options?: QueryOptions<M>,
    transaction?: Transaction,
  ): Promise<Readonly<M>[]> => {
    const queries: Query[] = [];
    const sliceSize = 10;
    const datastoreOrTransaction = transaction || datastore;
    filters = objects.map(filters as any, (k, v) => [k, Array.isArray(v) ? v : ['=', v]]) as QueryFilters<M>;
    const unindexedFilters = Object.keys(filters).filter((prop) => unindexedProps.get(propsClass)?.includes(prop));
    if (unindexedFilters.length > 0) {
      throw Error(`Unable to query for unindexed properties ${JSON.stringify(unindexedFilters)}.`);
    }
    const inQueryFilters = Object.values(filters).filter(([operator]) => operator === 'IN');
    if (inQueryFilters.length > 1) {
      throw Error('Using IN queries on multiple properties is not supported.');
    } else if (inQueryFilters.length > 0 && options) {
      throw Error('Using order or limit options for IN queries is not supported.');
    }

    const groupCount = inQueryFilters.length > 0 ? Math.ceil(inQueryFilters[0][1].length / sliceSize) : 1;
    for (let group = 0; group < groupCount; group++) {
      let query = datastoreOrTransaction.createQuery(kind);
      objects.forEach(
        filters as {[key: string]: [Operator, Object | Object[]]},
        (property: string, operatorAndValue: [Operator, Object | Object[]]) => {
          const [operator, value] = operatorAndValue;
          if (operator === 'IN' && Array.isArray(value)) {
            query = query.filter(property, operator, value.slice(group * sliceSize, group * sliceSize + sliceSize));
          } else {
            query = query.filter(property, operator, value);
          }
        },
      );
      queries.push(query);
      if (options?.order) {
        const orders = Array.isArray(options.order) ? options.order : [options.order];
        orders.forEach((order) => {
          const [property, orderOptions] = Object.entries(order)[0];
          query = query.order(property, orderOptions);
        });
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
    }

    const groupedResults = await Promise.all(queries.map((query) => datastoreOrTransaction.runQuery(query)));
    const flattenedResults = groupedResults.flatMap(([results]) => results);
    const objs = await Promise.all(flattenedResults.map((data: M) => build(data)));
    if (!(await canView(ctx, objs))) {
      throw Error('Not Found'); // TODO error message/type
    }
    return objs;
  };

  return {
    create: create,
    load: load,
    query: query,
    update: update,
  };
}
