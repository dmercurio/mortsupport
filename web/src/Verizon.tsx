import React, {useEffect, useState} from 'react';
import css from './Verizon.module.css';
import verizonlogo from './verizonlogo.png';
import circle from './circle.png';
import checked from './checked.png';
import classNames from 'classnames';

const API_PATH = process.env.REACT_APP_API_PATH;
const POLLING_INTERVAL_SECONDS = 5;
const STATUSES = ['WAITING', 'VERIFYING', 'SUCCESS', 'FAILURE'];
const STEPS_CONTENT = [
  <p>Upload Link Sent</p>,
  <p>
    File Uploaded <br /> <span style={{fontSize: '12px'}}>Verifying Document</span>
  </p>,
  <p>Document Verified</p>,
];

// TODO: add indicator for verification failure
export default function Verizon() {
  const [uploadLink, setUploadLink] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    async function updateDocumentStatus() {
      if (!uploadLink) {
        return;
      }
      const uploadId = uploadLink.split('/').at(-1);

      const documentStatusRequest = await fetch(`${API_PATH}/document-status/${uploadId}`);
      if (documentStatusRequest.ok) {
        const {status}: {status: string} = await documentStatusRequest.json();
        setCurrentStep(STATUSES.indexOf(status));
      }
    }

    updateDocumentStatus();
    const intervalId = setInterval(() => {
      updateDocumentStatus();
    }, POLLING_INTERVAL_SECONDS * 1000);

    return () => clearInterval(intervalId);
  }, [uploadLink]);

  async function generateUploadLink() {
    const uploadIdRequest = await fetch(`${API_PATH}/create-document`);

    if (uploadIdRequest.ok) {
      const uploadId = await uploadIdRequest.text();
      setUploadLink(`${window.location.protocol}//${window.location.host}/${uploadId}`);
    }
  }

  return (
    <>
      <div className={css.banner}>
        <img alt="verizon logo" src={verizonlogo} width={100} height={100} />
        <h1>Customer Support</h1>
      </div>

      <div className={css.pageSection} style={{height: '280px'}}>
        <h3>Deceased Customer Verification</h3>

        <button onClick={() => generateUploadLink()}>Send Document Upload Link</button>

        {uploadLink && (
          <div>
            <div className={css.progressBar}>
              {STEPS_CONTENT.map((stepContent, index) => (
                <div className={css.step}>
                  <img
                    alt=""
                    src={index === currentStep ? checked : circle}
                    className={classNames(css.statusIcon, index <= currentStep ? css.complete : css.incomplete)}
                  />
                  {index === 0 ? (
                    <a target="_blank" href={uploadLink} rel="noreferrer"><div>{stepContent}</div></a>
                  ) : (
                    <div>{stepContent}</div>
                  )}
                </div>
              ))}
            </div>

            <div className={css.barContainer}>
              <div className={currentStep > 0 ? css.complete : css.emptyBar}></div>
              <div className={currentStep > 1 ? css.complete : css.emptyBar}></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
