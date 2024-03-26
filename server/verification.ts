import * as chrono from 'chrono-node';
import {Document, DocumentStatus, DocumentStore} from './DocumentStore';
import {bucket, documentAI, documentAIFormProcessor, idProofingProcessor, storage} from './lib/environment';
import {google} from '@google-cloud/documentai/build/protos/protos';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {month: '2-digit', day: '2-digit', year: 'numeric'}; // MM/DD/YYYY
const NAME_MODIFIERS = ['jr', 'sr', 'i', 'ii', 'iii'];

export async function verify(documentObj: Document) {
  const [imageData] = await storage.bucket(bucket).file(documentObj.filename!).download();

  let document: google.cloud.documentai.v1.IDocument | null | undefined;
  let idProof: google.cloud.documentai.v1.IDocument | null | undefined;
  try {
    const [documentResult, idProofResult] = await Promise.all([
      documentAI.processDocument({
        name: documentAIFormProcessor,
        rawDocument: {
          content: imageData,
          mimeType: documentObj.mimetype,
        },
      }),
      documentAI.processDocument({
        name: idProofingProcessor,
        rawDocument: {
          content: imageData,
          mimeType: documentObj.mimetype,
        },
      }),
    ]);
    document = documentResult[0].document;
    idProof = idProofResult[0].document;
  } catch (e) {
    console.error(e);
    await DocumentStore.update({}, documentObj.id, {status: 'FAILURE', statusMessage: 'Error processing document'});
    return;
  }

  const idProofEntities = new Map(idProof?.entities?.map((entity) => (
    [entity.type, entity.normalizedValue?.text]
  )));

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
      .filter((part) => !NAME_MODIFIERS.includes(part))
      .filter((part) => part.length > 0);
  const normalizeSSN = (ssn: string) => ssn.replaceAll(/[^0-9]/g, '').slice(-4);

  let birthdateVerified = false;
  let ssnVerified = documentObj.ssnLast4 === '';
  let deathdateVerified = false;
  let certificateVerified = false;
  let idProofVerified = idProofEntities.get('fraud_signals_is_identity_document') === 'PASS';
  const certificateKeywords = new Set<string>();
  const expectedNameParts = normalizeName(documentObj.name);
  const parsedFields: Record<string, any> = {};
  const detectedNames = new Set<string>();
  let match: RegExpMatchArray | null | undefined;
  for (let field of fields) {
    if (field?.fieldName?.match(/birth.*date|date.*birth/i) && !birthdateVerified) {
      const birthdate = chrono.parseDate(field.fieldValue)?.toLocaleDateString('en-US', DATE_FORMAT) || '';
      parsedFields.birthdate = birthdate;
      birthdateVerified = parsedFields.birthdate === documentObj.birthdate;
    } else if (field?.fieldName?.match(/name/i)) {
      const parsedNameParts = normalizeName(field.fieldValue);
      if (parsedNameParts.length >= 2) {
        detectedNames.add(`${parsedNameParts[0]} ${parsedNameParts.at(-1)}`);
      }
    } else if (field?.fieldName?.match(/(social.*security)|(social.*number)|ssn/i) && !ssnVerified) {
      parsedFields.ssnLast4 = normalizeSSN(field.fieldValue);
      ssnVerified = parsedFields.ssnLast4 === documentObj.ssnLast4;
    } else if (field?.fieldName?.match(/((death|dead).*date)|(date.*(death|dead))/i) && !deathdateVerified) {
      const deathdate = chrono.parseDate(field.fieldValue)?.toLocaleDateString('en-US', DATE_FORMAT) || '';
      parsedFields.deathdate = deathdate;
      deathdateVerified = parsedFields.deathdate === documentObj.deathdate;
    } else if ((match = field?.fieldName?.match(/(location|place|time|county)/i))) {
      certificateKeywords.add(match[1]);
      certificateVerified = certificateKeywords.size >= 2;
    }
  }
  const nameVerified = detectedNames.has(`${expectedNameParts[0]} ${expectedNameParts.at(-1)}`);
  parsedFields.names = Array.from(detectedNames);
  const status: DocumentStatus =
    birthdateVerified &&
    nameVerified &&
    ssnVerified &&
    deathdateVerified &&
    certificateVerified &&
    idProofVerified
      ? 'SUCCESS'
      : 'FAILURE';
  let statusMessage = '';
  if (!idProofVerified || !certificateVerified) {
    statusMessage = 'Unable to verify certificate';
  } else if (!nameVerified) {
    statusMessage = 'Name mismatch';
  } else if (!birthdateVerified) {
    statusMessage = 'Birthdate mismatch';
  } else if (!ssnVerified) {
    statusMessage = 'SSN mismatch';
  } else if (!deathdateVerified) {
    statusMessage = 'Date of death mismatch';
  }
  await DocumentStore.update({}, documentObj.id, {status, statusMessage, fields: parsedFields});
}
