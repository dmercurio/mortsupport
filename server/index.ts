import * as fs from 'fs';
import compression from 'compression';
import express, {Router} from 'express';
import helmet from 'helmet';
import time from './lib/time';
import {storage} from './lib/environment';

const router = Router();

// status check endpoint
const statusCheck = JSON.parse(fs.readFileSync('../infrastructure/outputs/staging/statusCheck.json', 'utf8'));
router.get(statusCheck.path, async (request, response) => {
  response.send(statusCheck.content);
});

const BUCKET = `${process.env.GOOGLE_CLOUD_PROJECT}-bucket`;

router.get('/api/upload-url/:documentId', async (request, response) => {
  const document = {id: request.params.documentId}; // TODO this is just a stub - load the object from the documentId

  await storage
    .bucket(BUCKET)
    .file(`${document.id}.jpg`) // TODO prefix with clientId
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + time.milliseconds({hours: 1}),
    });
});

const app = express();
app.use(compression());
app.use(helmet());
app.use('/', router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080');
});
