import './App.css';
import UploadDocument from './UploadDocument';
import {BrowserRouter, Route, Routes} from 'react-router-dom';

// button to generate a link
// maybe in the future - send a text message
// need to create some db objects
//  - associate that link with some user

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route key="upload-document" path="/:documentId" element={<UploadDocument />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
