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

// simple ui for customer service rep to generate a link for a user

// simple ui for a user to upload a photo


const app = express();
app.use(compression());
app.use(helmet());
app.use("/", router);
app.listen(8080, () => {
  console.log('server started on http://localhost:8080')
});
