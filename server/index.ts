import * as fs from 'fs';
import compression from 'compression';
import cors from 'cors';
import express, {Router} from 'express';
import helmet from 'helmet';
import time from './lib/time';
import {env, storage} from './lib/environment';
import {router as localRouter} from './local';
import {Document, DocumentStore} from './DocumentStore';

const app = express();
const router = Router();

// status check endpoint
const statusCheck = JSON.parse(fs.readFileSync('../infrastructure/outputs/staging/statusCheck.json', 'utf8'));
router.get(statusCheck.path, async (request, response) => {
  response.send(statusCheck.content);
});

const BUCKET = `${process.env.GOOGLE_CLOUD_PROJECT}-bucket`;

if (env === 'local') {
  router.use('/local/storage', localRouter);
  app.use(cors({origin: 'http://localhost:3000'}));
}

router.all('/api/create-document', async (request, response) => {
  const document = await DocumentStore.create({});
  response.send(document.id);
});

router.all('/api/document-status/:documentId', async (request, response) => {
  const document = await DocumentStore.load({}, request.params.documentId);
  response.send({id: document.id, verified: Boolean(document.verified)});
});

router.get('/api/upload-url/:documentId', async (request, response) => {
  const document = (await DocumentStore.query({}, {id: request.params.documentId})).at(0);
  if (!document) {
    response.sendStatus(404);
    return;
  }

  const url = (
    await storage
      .bucket(BUCKET)
      .file(`${document.id}.jpg`) // TODO prefix with clientId
      .getSignedUrl({
        action: 'write',
        contentType: 'image/jpeg',
        expires: Date.now() + time.milliseconds({hours: 1}),
        version: 'v4',
      })
  )[0];
  response.send({url: url, complete: Boolean(document.complete)});
});

router.post('/api/upload-complete/:documentId', async (request, response) => {
  await DocumentStore.update({}, request.params.documentId, {complete: 1});
  response.send();
});

app.use(compression());
app.use(helmet());
app.use('/', router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080');
});
