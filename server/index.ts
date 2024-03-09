import Tasks, {taskHandlerMiddleware} from './lib/tasks';
import compression from 'compression';
import cors from 'cors';
import express, {Router} from 'express';
import helmet from 'helmet';
import time from './lib/time';
import {DocumentStore} from './DocumentStore';
import {bucket, env, statusCheck, storage} from './lib/environment';
import {router as localRouter} from './local';
import {verify} from './verification';

const app = express();
const router = Router();

// status check endpoint
router.get(statusCheck.path, async (request, response) => {
  response.send(statusCheck.content);
});

if (env === 'local') {
  router.use('/local/storage', localRouter);
  app.use(cors({origin: 'http://localhost:3000'}));
}

router.all('/api/create-document', async (request, response) => {
  const document = await DocumentStore.create({
    name: request.body.name,
    birthdate: request.body.birthdate,
    deathdate: request.body.deathdate,
    ssnLast4: request.body.ssnLast4,
  });
  response.send(document.id);
});

router.all('/api/document-status/:documentId', async (request, response) => {
  const document = await DocumentStore.load({}, request.params.documentId);
  response.send({id: document.id, status: document.status, statusMessage: document.statusMessage});
});

router.post('/api/upload-url/:documentId', async (request, response) => {
  const document = (await DocumentStore.query({}, {id: request.params.documentId})).at(0);
  if (!document) {
    response.sendStatus(404);
    return;
  }

  const {extension, contentType} = request.body;
  const filename = `${document.id}.${extension}`; // TODO prefix with clientId

  await DocumentStore.update({}, request.params.documentId, {filename: filename, mimetype: contentType});

  const url = (
    await storage
      .bucket(bucket)
      .file(filename)
      .getSignedUrl({
        action: 'write',
        contentType: contentType,
        expires: Date.now() + time.milliseconds({hours: 1}),
        version: 'v4',
      })
  )[0];
  response.send({url: url});
});

router.post('/api/upload-complete/:documentId', async (request, response) => {
  await DocumentStore.update({}, request.params.documentId, {status: 'VERIFYING'});

  await Tasks.enqueue('/tasks/verify-document', {documentId: request.params.documentId});

  response.send();
});

export const taskHandlers: Router = Router();
router.use('/tasks', taskHandlerMiddleware, taskHandlers);

taskHandlers.post('/verify-document', async (request, response) => {
  const documentObj = await DocumentStore.load({}, request.body.documentId);
  verify(documentObj);
  response.send();
});

app.use(compression());
app.use(helmet());
app.use(express.json());
app.use('/', router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080');
});
