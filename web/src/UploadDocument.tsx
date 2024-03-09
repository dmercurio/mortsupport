import camera from './camera.png';
import checkmark from './checkmark.png';
import classnames from 'classnames';
import css from './UploadDocument.module.css';
import {Buffer} from 'buffer';
import {FullCenter, Stack} from './ui/layout';
import {useFetch} from 'usehooks-ts';
import {useParams} from 'react-router-dom';
import {useState} from 'react';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';

// Required for pdfjs
GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

const API_PATH = process.env.REACT_APP_API_PATH;
const THUMBNAIL_CAPTURE_HEIGHT = 320;
const PDF_THUMBNAIL_SCALE = 1.5;

type Document = {
  id: string;
  status: string;
};

type PhotoData = {
  data: ArrayBuffer;
  contentType: string;
  extension: string;
};

function Complete() {
  return (
    <FullCenter>
      <h2>Upload Complete</h2>
      <img alt="success" src={checkmark} height={256} width={256} />
    </FullCenter>
  );
}

export default function UploadDocument() {
  const {documentId} = useParams();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [photoDataBuffer, setPhotoDataBuffer] = useState<ArrayBuffer>(new ArrayBuffer(0));
  const [photoData, setPhotoData] = useState<PhotoData>();
  const [complete, setComplete] = useState<boolean>(false);
  const [thumbnailBase64, setThumbnailBase64] = useState<string>('');
  const {data} = useFetch<Document>(`${API_PATH}/document-status/${documentId}`);

  if (complete || data?.status !== 'WAITING') {
    return <Complete />;
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const uploadUrlRes = await (
      await fetch(`${API_PATH}/upload-url/${documentId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({data, ...photoData}),
      })
    ).json();

    const uploadResult = await fetch(uploadUrlRes!.url, {
      method: 'PUT',
      body: photoData!.data,
      headers: {'Content-Type': photoData!.contentType},
    });

    if (uploadResult.ok) {
      const completeResult = await fetch(`${API_PATH}/upload-complete/${documentId}`, {method: 'POST'});
      if (completeResult.ok) {
        setComplete(true);
      }
    }
    setSubmitting(false);
  };

  const readPhotoData = (file: File): Promise<ArrayBuffer> => {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target!.result as ArrayBuffer);
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const createThumbnailBase64 = (thumbnailPhotoData: PhotoData): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // shouldn't ever happen, but required for pdf rendering
    if (!ctx) {
      return Promise.reject(new Error('Error in createThumbnailBase64: failure in canvas.getContext()'));
    }

    return new Promise<string>(async (resolve, reject) => {
      if (thumbnailPhotoData.extension === 'pdf') {
        const photoDataThumbnailBuffer = new ArrayBuffer(thumbnailPhotoData.data.byteLength);
        new Uint8Array(photoDataThumbnailBuffer).set(new Uint8Array(thumbnailPhotoData.data));

        const pdf = await getDocument(photoDataThumbnailBuffer).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({scale: PDF_THUMBNAIL_SCALE});
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({canvasContext: ctx, viewport: viewport}).promise;
        resolve(canvas.toDataURL());
      } else {
        const image = new Image();
        image.onload = () => {
          const aspectRatio = image.width / image.height;
          const captureWidth = THUMBNAIL_CAPTURE_HEIGHT * aspectRatio;
          canvas.width = captureWidth;
          canvas.height = THUMBNAIL_CAPTURE_HEIGHT;
          ctx?.drawImage(image, 0, 0, image.width, image.height, 0, 0, captureWidth, THUMBNAIL_CAPTURE_HEIGHT);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.onerror = (err) => {
          reject(err);
        };
        image.src = `data:image/jpeg;base64,${Buffer.from(photoDataBuffer).toString('base64')}`;
      }
    });
  };

  const buildPhotoData = async (e: React.ChangeEvent<HTMLInputElement>): Promise<PhotoData> => {
    const file = e.target.files![0];

    return {
      data: await readPhotoData(file),
      contentType: file.type,
      extension: file.name.split('.').at(-1)!,
    };
  };

  return (
    <FullCenter>
      <form onSubmit={onSubmit}>
        <Stack className={css.sharePhoto}>
          <h2>
            Share a Photo of <br />
            the Document
          </h2>
          <Stack className={css.shareBox}>
            <label className={classnames(css.tapToShare, {[css.tapToShareEmpty]: !thumbnailBase64})}>
              {thumbnailBase64 ? (
                <img
                  alt=""
                  src={thumbnailBase64}
                  style={{maxWidth: 240, maxHeight: 160, border: '1px solid #ddd', padding: '2px'}}
                />
              ) : (
                <>
                  <div>Tap to Share</div>
                  <img alt="" src={camera} width={80} height={80} />
                </>
              )}
              <input
                type="file"
                accept="application/pdf,image/gif,image/tiff,image/jpeg,image/png,image/bmp,image/webp"
                onChange={async (e) => {
                  const newPhotoData = await buildPhotoData(e);
                  setPhotoData(newPhotoData);
                  setPhotoDataBuffer(newPhotoData.data);
                  setThumbnailBase64(await createThumbnailBase64(newPhotoData));
                }}
              />
            </label>
          </Stack>
          <div>
            <input type="submit" value="Submit" disabled={!photoData || submitting} />
          </div>
        </Stack>
      </form>
    </FullCenter>
  );
}
