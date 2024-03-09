import {useEffect, useState} from 'react';
import checked from './checked.png';
import circle from './circle.png';
import classNames from 'classnames';
import css from './Verizon.module.css';
import verizonlogo from './verizonlogo.png';
import x from './x.png';

const API_PATH = process.env.REACT_APP_API_PATH;
const POLLING_INTERVAL_SECONDS = 5;

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
  const [currentStatus, setCurrentStatus] = useState('WAITING');
  const [statusReason, setStatusReason] = useState('');
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
        setCurrentStatus(status);
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

        <label style={{marginRight: '8px'}}>Date of Death </label>
        <input type="date" value={deathDate} autoFocus={true} onChange={(e) => setDeathDate(e.target.value)} />

        <button onClick={() => generateUploadLink()} disabled={!deathDate}>
          Send Document Upload Link
        </button>

        {uploadLink && (
          <div>
            <div className={css.progressBar}>
              <div className={css.step}>
                <img
                  alt=""
                  src={currentStatus === 'WAITING' ? checked : circle}
                  className={classNames(css.statusIcon, css.complete)}
                />
                <div>
                  <a target="_blank" href={uploadLink} rel="noreferrer">
                    <p>Upload Link Sent</p>
                  </a>
                </div>
              </div>
              <div className={css.step}>
                <img
                  alt=""
                  src={currentStatus === 'VERIFYING' ? checked : circle}
                  className={classNames(css.statusIcon, currentStatus === 'WAITING' ? css.incomplete : css.complete)}
                />
                <div>
                  <p>File Uploaded</p>
                  <span className={css.statusSubtext}>Verifying Document</span>
                </div>
              </div>
              <div className={css.step}>
              {currentStatus === 'FAILURE' ? (
                <>
                 <img alt="" src={x} className={classNames(css.statusIcon, css.failure)} />
                 <div>
                  <p>Verification Failed</p>
                  <span className={css.statusSubtext}>{statusReason}</span>
                 </div>
                </>
              ) : (
                <>
                  <img
                    alt=""
                    src={currentStatus === 'SUCCESS' ? checked : circle}
                    className={classNames(css.statusIcon, currentStatus === 'SUCCESS' ? css.complete : css.incomplete)}
                  />
                  <p>Document Verified</p>
                </>
              )}
              </div>
            </div>
            <div className={css.barContainer}>
              <div className={currentStatus === 'WAITING' ? css.emptyBar : css.complete}></div>
              <div className={['SUCCESS', 'FAILURE'].includes(currentStatus) ? css.complete : css.emptyBar}></div>
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
