import fs from 'fs';
import path from 'path';

class Bucket {
  constructor(
    public localPrefix: string,
    public name: string,
  ) {
    this.localPrefix = localPrefix;
    this.name = name;
  }

  file(name: string): File {
    return new File(this, name);
  }
}

type Options = {
  version: string;
  action: 'read';
  expires: number;
};

class File {
  constructor(
    private bucket: Bucket,
    private name: string,
  ) {
    this.bucket = bucket;
    this.name = name;
  }

  async getSignedUrl(options: Options): Promise<[string]> {
    return [`http://localhost:8080/local/storage/${this.name}`];
  }

  async copy(destination: string): Promise<void> {
    const src = path.join(this.bucket.localPrefix, this.name);
    const dst = path.join(this.bucket.localPrefix, destination);
    fs.mkdirSync(path.dirname(dst), {recursive: true});
    fs.copyFileSync(src, dst);
  }

  async save(data: string | Buffer): Promise<void> {
    const dst = path.join(this.bucket.localPrefix, this.name);
    fs.mkdirSync(path.dirname(dst), {recursive: true});
    fs.writeFileSync(dst, data);
  }
}

export default class LocalStorage {
  constructor(private localPrefix: string) {
    this.localPrefix = localPrefix;
  }

  bucket(name: string): Bucket {
    return new Bucket(this.localPrefix, name);
  }
}
