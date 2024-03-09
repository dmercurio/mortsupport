import * as chrono from 'chrono-node';
import {Document, DocumentStatus, DocumentStore} from './DocumentStore';
import {bucket, documentAI, documentAIFormProcessor, storage} from './lib/environment';
import {google} from '@google-cloud/documentai/build/protos/protos';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {month: '2-digit', day: '2-digit', year: 'numeric'}; // MM/DD/YYYY
const NAME_MODIFIERS = ['jr', 'sr', 'i', 'ii', 'iii'];

export async function verify(documentObj: Document) {
  const [imageData] = await storage.bucket(bucket).file(documentObj.filename!).download();

  let document: google.cloud.documentai.v1.IDocument | null | undefined;
  try {
    document = (
      await documentAI.processDocument({
        name: documentAIFormProcessor,
        rawDocument: {
          content: imageData,
          mimeType: documentObj.mimetype,
        },
      })
    )[0].document;
  } catch (e) {
    console.error(e);
    await DocumentStore.update({}, documentObj.id, {status: 'FAILURE'});
    return;
  }

  const fields =
    document?.pages?.flatMap((page) =>
      page.formFields?.map((field) => ({
        fieldName: field.fieldName?.textAnchor?.content?.replaceAll('\n', ' ').trim() || '',
        fieldValue: field.fieldValue?.textAnchor?.content?.replaceAll('\n', ' ').trim() || '',
      })),
    ) || [];

  const normalizeName = (name: string) =>
    name
      .replaceAll(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .map((part) => part.toLowerCase())
      .filter((part) => !NAME_MODIFIERS.includes(part));
  const normalizeSSN = (ssn: string) => ssn.replaceAll(/[^0-9]/g, '').slice(-4);

  let birthdateVerified = false;
  let firstNameVerified = false;
  let lastNameVerified = false;
  let ssnVerified = false;
  let deathdateVerified = false;
  let certificateVerified = false;
  const expectedNameParts = normalizeName(documentObj.name);
  const parsedFields: Record<string, string> = {};
  for (let field of fields) {
    if (field?.fieldName?.match(/birth.*date|date.*birth/i) && !birthdateVerified) {
      const birthdate = chrono.parseDate(field.fieldValue)?.toLocaleDateString('en-US', DATE_FORMAT) || '';
      parsedFields.birthdate = birthdate;
      birthdateVerified = parsedFields.birthdate === documentObj.birthdate;
    } else if (field?.fieldName?.match(/name|first|last/i) && (!firstNameVerified || !lastNameVerified)) {
      const parsedNameParts = normalizeName(field.fieldValue);
      parsedFields.name = field.fieldValue;
      if (parsedNameParts[0] === expectedNameParts[0]) {
        firstNameVerified = true;
      }
      if (parsedNameParts.at(-1) === expectedNameParts.at(-1)) {
        lastNameVerified = true;
      }
    } else if (field?.fieldName?.match(/social.*security|social.*number|ssn/i) && !ssnVerified) {
      parsedFields.ssnLast4 = normalizeSSN(field.fieldValue);
      ssnVerified = parsedFields.ssnLast4 === documentObj.ssnLast4;
    } else if (field?.fieldName?.match(/death.*date|date.*death/i) && !deathdateVerified) {
      const deathdate = chrono.parseDate(field.fieldValue)?.toLocaleDateString('en-US', DATE_FORMAT) || '';
      parsedFields.deathdate = deathdate;
      deathdateVerified = parsedFields.deathdate === documentObj.deathdate;
    }
  }
  const status: DocumentStatus =
    birthdateVerified && firstNameVerified && lastNameVerified && ssnVerified && deathdateVerified ? 'SUCCESS' : 'FAILURE';
  let statusMessage = '';
  if (!firstNameVerified || !lastNameVerified) {
    statusMessage = 'Name mismatch';
  } else if (!birthdateVerified) {
    statusMessage = 'Birthdate mismatch';
  } else if (!ssnVerified) {
    statusMessage = 'SSN mismatch';
  } else if (!deathdateVerified) {
    statusMessage = 'Date of death mismatch';
  } else if (!certificateVerified) {
    statusMessage = 'Unable to verify certificate';
  }
  await DocumentStore.update({}, documentObj.id, {status, statusMessage, fields: parsedFields});
}
