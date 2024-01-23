import camera from './camera.png';
import css from './UploadDocument.module.css';
import {FullCenter, Stack} from "./ui/layout";
import {useParams} from 'react-router-dom';

export default function UploadDocument() {
  const {documentId} = useParams();
  return (
    <FullCenter>
      <form onSubmit={(e) => {e.preventDefault()}}>
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
