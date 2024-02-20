import * as fs from 'fs';
import Tasks, {taskHandlerMiddleware} from './lib/tasks';
import compression from 'compression';
import cors from 'cors';
import express, {Router} from 'express';
import helmet from 'helmet';
import time from './lib/time';
import {DocumentStatus, DocumentStore} from './DocumentStore';
import {documentAI, documentAIFormProcessor, env, statusCheck, storage} from './lib/environment';
import {router as localRouter} from './local';

const app = express();
const router = Router();

const DATE_FORMAT: Intl.DateTimeFormatOptions = {month: '2-digit', day: '2-digit', year: 'numeric'}; // MM/DD/YYYY

// status check endpoint
router.get(statusCheck.path, async (request, response) => {
  response.send(statusCheck.content);
});

const BUCKET = `${process.env.GOOGLE_CLOUD_PROJECT}-bucket`;

if (env === 'local') {
  router.use('/local/storage', localRouter);
  app.use(cors({origin: 'http://localhost:3000'}));
}

router.all('/api/create-document', async (request, response) => {
  const document = await DocumentStore.create({
    name: request.body.name,
    birthdate: request.body.birthdate,
    ssnLast4: request.body.ssnLast4,
  });
  console.log(document);
  response.send(document.id);
});

router.all('/api/document-status/:documentId', async (request, response) => {
  const document = await DocumentStore.load({}, request.params.documentId);
  response.send({id: document.id, status: document.status});
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
  response.send({url: url, complete: document.status !== 'WAITING'});
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
  const [imageData] = await storage.bucket(BUCKET).file(`${documentObj.id}.jpg`).download();

  const document = (
    await documentAI.processDocument({
      name: documentAIFormProcessor,
      rawDocument: {
        content: imageData,
        mimeType: 'application/pdf',
      },
    })
  )[0].document;

  const fields =
    document?.pages?.flatMap((page) =>
      page.formFields?.map((field) => ({
        fieldName: field.fieldName?.textAnchor?.content?.trim() || '',
        fieldValue: field.fieldValue?.textAnchor?.content?.trim() || '',
      })),
    ) || [];

  const normalizeName = (name: string) =>
    name
      .replaceAll(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .map((part) => part.toLowerCase());
  const normalizeSSN = (ssn: string) => ssn.replaceAll(/[^0-9]/g, '').slice(-4);

  let birthdateVerified = false;
  let nameVerified = false;
  let ssnVerified = false;
  const parsedFields: Record<string, string> = {};
  for (let field of fields) {
    if (field?.fieldName?.match(/birth.*date|date.*birth/i) && !birthdateVerified) {
      const birthdate = field.fieldValue ? new Date(field.fieldValue) : new Date();
      parsedFields.birthdate = birthdate.toLocaleDateString('en-US', DATE_FORMAT);
      birthdateVerified = parsedFields.birthdate === documentObj.birthdate;
    } else if (field?.fieldName?.match(/name/i) && !nameVerified) {
      const nameParts = normalizeName(field.fieldValue);
      const documentNameParts = normalizeName(documentObj.name);
      parsedFields.name = field.fieldValue;
      nameVerified =
        nameParts.length >= 2 && nameParts[0] === documentNameParts[0] && nameParts.at(-1) === documentNameParts.at(-1); // first and last name match
    } else if (field?.fieldName?.match(/social.*security|social.*number/i) && !ssnVerified) {
      parsedFields.ssnLast4 = normalizeSSN(field.fieldValue);
      ssnVerified = parsedFields.ssnLast4 === documentObj.ssnLast4;
    }
  }
  const status: DocumentStatus = birthdateVerified && nameVerified && ssnVerified ? 'SUCCESS' : 'FAILURE';
  await DocumentStore.update({}, documentObj.id, {status: status, fields: parsedFields});

  response.send();
});

app.use(compression());
app.use(helmet());
app.use(express.json());
app.use('/', router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080');
});
