import camera from './camera.png';
import checkmark from './checkmark.png';
import classnames from 'classnames';
import css from './UploadDocument.module.css';
import {Buffer} from 'buffer';
import {FullCenter, Stack} from './ui/layout';
import {useFetch} from 'usehooks-ts';
import {useParams} from 'react-router-dom';
import {useState} from 'react';

const API_PATH = process.env.REACT_APP_API_PATH;
const THUMBNAIL_CAPTURE_HEIGHT = 320;

type UploadUrl = {
  url: string;
  complete: boolean;
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
  const [photoData, setPhotoData] = useState<ArrayBuffer>();
  const [complete, setComplete] = useState<boolean>(false);
  const [thumbnailBase64, setThumbnailBase64] = useState<string>('');
  const {data/*, error*/} = useFetch<UploadUrl>(`${API_PATH}/upload-url/${documentId}`);

  if (complete || data?.complete) {
    return <Complete />;
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const uploadResult = await fetch(data!.url, {
      method: 'PUT',
      body: photoData,
      headers: {'Content-Type': 'image/jpeg'},
    });

    if (uploadResult.ok) {
      const completeResult = await fetch(`${API_PATH}/upload-complete/${documentId}`, {method: 'POST'});
      if (completeResult.ok) {
        setComplete(true);
      }
    }
  };

  const readPhotoData = (e: React.ChangeEvent<HTMLInputElement>): Promise<ArrayBuffer> => {
    const file = e.target.files![0];
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

  const createThumbnailBase64 = (photoData: ArrayBuffer): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return new Promise<string>((resolve, reject) => {
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
      image.src = `data:image/jpeg;base64,${Buffer.from(photoData).toString('base64')}`;
    });
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
                <img alt="" src={thumbnailBase64} style={{maxWidth: 240, maxHeight: 240}} />
              ) : (
                <>
                  <div>Tap to Share</div>
                  <img alt="" src={camera} width={80} height={80} />
                </>
              )}
              <input
                type="file"
                accept="image/jpeg"
                onChange={async (e) => {
                  const newPhotoData = await readPhotoData(e);
                  setPhotoData(newPhotoData);
                  setThumbnailBase64(await createThumbnailBase64(newPhotoData));
                }}
              />
            </label>
          </Stack>
          <div>
            <input type="submit" value="Submit" disabled={!photoData} />
          </div>
        </Stack>
      </form>
    </FullCenter>
  );
}
