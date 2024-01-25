import express, {Request, Response, Router} from 'express';
import path from 'path';
import {mkdirSync, writeFileSync} from 'fs';

export const router = Router();
router.get('/:path(*)', async (request: Request, response: Response) => {
  response.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.sendFile(`.local/storage/${request.params.path}`, {root: './'});
});
router.options('/:path(*)', async (request: Request, response: Response) => {
  response.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.set('Access-Control-Allow-Methods', 'PUT');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.send();
});
router.put('/:path(*)', express.raw({type: '*/*', limit: '50mb'}), async (request: Request, response: Response) => {
  response.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  mkdirSync(`.local/storage/${path.dirname(request.params.path)}`, {recursive: true});
  writeFileSync(`.local/storage/${request.params.path}`, request.body);
  response.send();
});
