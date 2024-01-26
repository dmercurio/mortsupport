import fs from 'fs';
import path from 'path';
import sqlite3 from 'better-sqlite3';
import type {Operator, OrderOptions} from '@google-cloud/datastore/build/src/query';

type Key = {
  kind: string;
  id: string;
};
type Data = {
  [key: string]: boolean | number | string | undefined;
};
type Entity = {
  key: Key;
  data: Data;
  method: 'insert' | 'upsert';
  excludeFromIndexes: string[];
};

interface Filter {
  property: string;
  operator: Operator;
  value: boolean | number | string | Key;
}
class Query {
  filters: Filter[] = [];
  orders: [string, string][] = [];
  _limit?: number;

  constructor(public kind: string) {
    this.kind = kind;
  }

  select(property: string) {
    return this;
  }

  filter(property: string, operator: Operator, value: number | string): this {
    this.filters.push({property, operator, value});
    return this;
  }

  order(property: string, options?: OrderOptions): this {
    this.orders.push([property, options?.descending ? 'DESC' : 'ASC']);
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }
}

export default class {
  private db!: sqlite3.Database;
  private filename: string;

  reinitialize(): void {
    this.db = new sqlite3(this.filename);
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS documents (
        kind TEXT NOT NULL, __key__ TEXT, value JSON, PRIMARY KEY(kind, __key__)
      )`,
      )
      .run();
  }

  constructor(filename: string) {
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    this.filename = filename;
    this.reinitialize();
  }

  key(path: string[]): Key {
    return {kind: path[0], id: path[1]};
  }

  async get(keys: Key[]): Promise<any[] | null>;
  async get(key: Key): Promise<any[] | null>;
  async get(keyOrKeys: Key | Key[]): Promise<any[] | null> {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const results = this.db
      .prepare(`SELECT value FROM documents WHERE kind=? AND __key__ IN(${keys.map(() => '?').join(',')})`)
      .all(keys[0].kind, ...keys.map((k) => k.id));
    return [results.map((r) => JSON.parse((r as any).value)), {}]; // TODO query info
  }

  async save(entity: Entity): Promise<{}> {
    this.db
      .prepare(
        `INSERT ${
          entity.method === 'upsert' ? 'OR REPLACE' : ''
        } INTO documents (kind, __key__, value) VALUES (?, ?, ?)`,
      )
      .run(entity.key.kind, entity.key.id, JSON.stringify(entity.data));
    return {};
  }

  createQuery(kind: string): Query {
    return new Query(kind);
  }

  async runQuery(query: Query): Promise<{}[]> {
    let sql = 'SELECT value FROM documents WHERE kind=?';
    const params: Filter['value'][] = [query.kind];
    query.filters.forEach((filter) => {
      sql += ` AND JSON_EXTRACT(value, '$.${filter.property}') ${filter.operator} `;
      sql += Array.isArray(filter.value) ? `(${filter.value.map(() => '?').join(',')})` : '?';
      Array.isArray(filter.value) ? params.push(...filter.value) : params.push(filter.value);
    });
    if (query.orders.length > 0) {
      sql += ' ORDER BY ' + query.orders.map((order) => `JSON_EXTRACT(value, '$.${order[0]}') ${order[1]}`).join(', ');
    }
    if (query._limit) {
      sql += ` LIMIT ${query._limit}`;
    }
    const results = this.db.prepare(sql).all(params);
    const parsedResults = results.map((result) => JSON.parse((result as any).value));
    return [parsedResults, {}]; // TODO query info
  }

  transaction(): this {
    return Object.assign(this, {
      run: async () => {},
      commit: async () => {},
      rollback: async () => {},
    });
  }
}
