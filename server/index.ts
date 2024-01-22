import * as fs from 'fs';
import compression from 'compression';
import express, {Router} from 'express';
import helmet from 'helmet';

const router = Router();

// status check endpoint
const statusCheck = JSON.parse(fs.readFileSync('../infrastructure/outputs/staging/statusCheck.json', 'utf8'));
router.get(statusCheck.path, async(request, response) => {
  response.send(statusCheck.content);
});

const app = express();
app.use(compression());
app.use(helmet());
app.use("/", router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080')
});
