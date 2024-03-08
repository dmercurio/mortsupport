import {useEffect, useState} from 'react';
import checked from './checked.png';
import circle from './circle.png';
import classNames from 'classnames';
import css from './Verizon.module.css';
import verizonlogo from './verizonlogo.png';
import x from './x.png';

const API_PATH = process.env.REACT_APP_API_PATH;
const POLLING_INTERVAL_SECONDS = 5;
const STATUSES = ['WAITING', 'VERIFYING', 'SUCCESS', 'FAILURE'];

const stepsContent = (currentStep: number) => [
  <p>Upload Link Sent</p>,
  <p>
    File Uploaded <br /> <span style={{fontSize: '12px'}}>Verifying Document</span>
  </p>,
  <p>{currentStep === STATUSES.indexOf('FAILURE') ? 'Verification Failed' : 'Document Verified'}</p>,
];

const customers: [Customer, string][] = [
  [{name: 'Jill Diane Harmon', birthdate: '11/11/1962', last4SSN: '7034'}, 'DC Colorado.pdf'],
  [{name: 'Francis Baird Hutto Jr', birthdate: '06/25/1926', last4SSN: '6754'}, 'DC Colorado2.pdf'],
  [{name: 'Melvin Lipman', birthdate: '08/12/1928', last4SSN: ''}, 'DC Connecticut 2008.pdf'],
  [{name: 'Dorothy H Feigin', birthdate: '03/05/1932', last4SSN: ''}, 'DC Connecticut.pdf'],
];

type Customer = {
  name: string;
  birthdate: string;
  last4SSN: string;
};

function CustomerList({setSelectedCustomer}: {setSelectedCustomer: (customer: Customer) => void}) {
  return (
    <>
      <h3 style={{paddingLeft: '44px'}}>Select a Demo Customer</h3>
      <ul className={css.customerList}>
        {customers.map(([customer, filename], i) => (
          <li key={i} onClick={() => setSelectedCustomer(customer)}>
            {customer.name} <i>({filename})</i>
          </li>
        ))}
      </ul>
    </>
  );
}

function SingleCustomerView({customer}: {customer: Customer}) {
  const [uploadLink, setUploadLink] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [deathDate, setDeathDate] = useState('');

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
    // convert date from yyyy-mm-dd to mm/dd/yyyy
    const splitDate = deathDate.split('-');
    const formattedDeathDate = splitDate.slice(1).concat(splitDate[0]).join('/');

    const uploadIdRequest = await fetch(`${API_PATH}/create-document`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: customer.name,
        birthdate: customer.birthdate,
        deathdate: formattedDeathDate,
        ssnLast4: customer.last4SSN,
      }),
    });

    if (uploadIdRequest.ok) {
      const uploadId = await uploadIdRequest.text();
      setUploadLink(`${window.location.protocol}//${window.location.host}/${uploadId}`);
    }
  }

  return (
    <>
      <h3 style={{paddingLeft: '44px'}}>{customer.name}</h3>
      <div className={css.pageSection} style={{height: '310px'}}>
        <h3>Deceased Customer Verification</h3>

        <label>Date of Death </label>
        <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />

        <button onClick={() => generateUploadLink()} disabled={!deathDate}>
          Send Document Upload Link
        </button>

        {uploadLink && (
          <div>
            <div className={css.progressBar}>
              {stepsContent(currentStep).map((stepContent, index) => (
                <div key={index} className={css.step}>
                  {currentStep === STATUSES.indexOf('FAILURE') && index === 2 ? (
                    <img alt="" src={x} className={classNames(css.statusIcon, css.failure)} />
                  ) : (
                    <img
                      alt=""
                      src={index === currentStep ? checked : circle}
                      className={classNames(css.statusIcon, index <= currentStep ? css.complete : css.incomplete)}
                    />
                  )}
                  {index === 0 ? (
                    <a target="_blank" href={uploadLink} rel="noreferrer">
                      <div>{stepContent}</div>
                    </a>
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

// TODO: add indicator for verification failure
export default function Verizon() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  return (
    <>
      <div className={css.banner}>
        <img alt="verizon logo" src={verizonlogo} width={100} height={100} />
        <h1>Customer Support</h1>
      </div>
      {selectedCustomer ? (
        <SingleCustomerView customer={selectedCustomer} />
      ) : (
        <CustomerList setSelectedCustomer={setSelectedCustomer} />
      )}
    </>
  );
}
