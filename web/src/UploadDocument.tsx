import camera from './camera.png';
import css from './UploadDocument.module.css';
import {FullCenter, Stack} from "./ui/layout";

export default function UploadDocument() {
  return (
    <FullCenter>
      <form onSubmit={(e) => {e.preventDefault()}}>
        <Stack className={css.photos}>
          <h2>Share a Photo of the Document</h2>
          <Stack>
            <label className={css.uploadPhoto}>
              <div>Tap to Share</div>
              <img alt="" src={camera} width={80} height={80} />
              <input type="file" accept="image/jpeg" />
            </label>
          </Stack>
          <input type="submit" value="Submit" /* disabled={TODO} */ />
        </Stack>
      </form>
    </FullCenter>
  );
}
