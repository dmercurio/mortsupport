import camera from './camera.png';
import css from './UploadDocument.module.css';
import {FullCenter, Stack} from "./ui/layout";
import {useFetch} from 'usehooks-ts';
import {useParams} from 'react-router-dom';

const API_PATH = process.env.REACT_APP_API_PATH;

type UploadUrl = {
  url: string;
}

export default function UploadDocument() {
  const {documentId} = useParams();
  const {data: signedUrl/*, error*/} = useFetch<UploadUrl>(`${API_PATH}/upload-url/${documentId}`);

  const onSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const uploadResult = await fetch(signedUrl!.url, {method: 'PUT', body: 'asdf', headers: {'Content-Type': 'image/jpeg'}});

    if (uploadResult.ok) {
      await fetch(`${API_PATH}/upload-complete/${documentId}`, {method: 'POST'});
    }
  };

  return (
    <FullCenter>
      <form onSubmit={onSubmit}>
        <Stack className={css.sharePhoto}>
          <h2>Share a Photo of <br />the Document</h2>
          <Stack className={css.shareBox}>
            <label className={css.tapToShare}>
              <div>Tap to Share</div>
              <img alt="" src={camera} width={80} height={80} />
              <input type="file" accept="image/jpeg" />
            </label>
          </Stack>
          <div><input type="submit" value="Submit" /* disabled={TODO} */ /></div>
        </Stack>
      </form>
    </FullCenter>
  );
}
