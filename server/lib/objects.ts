export default class objects {
  static filter<K extends PropertyKey, V>(obj: {[k in K]?: V}, func: (k: K, v: V) => boolean): {[k in K]: V} {
    return Object.fromEntries(Object.entries(obj).filter(([key, value]) => func(key as K, value as V))) as {
      [k in K]: V;
    };
  }

  static map<K extends PropertyKey, V, K2 extends PropertyKey, V2>(
    obj: {[k in K]: V},
    func: (k: K, v: V) => [K2, V2],
  ): {[k in K2]: V2} {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => func(key as K, value as V))) as {[k in K2]: V2};
  }

  static forEach<K extends PropertyKey, V, T>(obj: {[k in K]: V}, func: (k: K, v: V) => T): void {
    for (const key in obj) {
      func(key, obj[key]);
    }
  }
}
