import * as fs from 'fs';
import compression from 'compression';
import express, {Router} from 'express';
import helmet from 'helmet';
import time from './lib/time';
import {env, storage} from './lib/environment';
import {router as localRouter} from './local';
import cors from 'cors';

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

router.get('/api/upload-url/:documentId', async (request, response) => {
  const document = {id: request.params.documentId}; // TODO this is just a stub - load the object from the documentId

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
  response.send({url: url});
});

router.post('/api/upload-complete/:documentId', async (request, response) => {
  response.send('');
});

app.use(compression());
app.use(helmet());
app.use('/', router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080');
});
