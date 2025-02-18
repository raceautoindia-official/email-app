import { useState, useEffect } from 'react';
import { sendEmails } from '../services/api';
import * as XLSX from 'xlsx';

function ComposeEmailPage() {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [file, setFile] = useState(null);
  const [recipientList,setRecipientList] = useState([])

  // Reset state when the page reloads
  useEffect(() => {
    setRecipients('');
    setSubject('');
    setMessage('');
    setStatus('');
    setFile(null);
  }, []); // Runs once when the component mounts

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      readExcelFile(uploadedFile);
    }
  };

  const readExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const emails = jsonData.flat().filter((email) => typeof email === 'string' && email.includes('@'));
      setRecipients((prev) => (prev ? prev + ', ' + emails.join(', ') : emails.join(', ')));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(recipients, message, subject);
  
    if (!recipients) {
      setStatus('No recipients found. Please add emails.');
      return;
    }
  
    // Trim and split recipients
    const emailList = recipients.split(',').map((email) => email.trim());
    if (emailList.length === 0 || emailList[0] === '') {
      setStatus('No valid recipients found.');
      return;
    }
  
    const confirmSend = window.confirm(
      `Are you sure you want to send this email to ${emailList.length} recipients?`
    );
  
    if (!confirmSend) {
      return; // Stop the process if user cancels
    }
  
    try {
      await sendEmails({ recipients: emailList, subject, message });
      setStatus('Emails sent successfully!');
  
      // Reset state
      setRecipients('');
      setSubject('');
      setMessage('');
      setFile(null);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };
  

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   console.log(recipients,message,subject);
  //   if (recipients) {
  //     setRecipientList(recipients.split(',').map((email) => email.trim()));
  //     console.log(recipientList);
  //   }
    
  //   if (recipientList.length === 0) {
  //     setStatus('No recipients found. Please add emails.');
  //     return;
  //   }

  //   const confirmSend = window.confirm(
  //     `Are you sure you want to send this email to ${recipientList.length} recipients?`
  //   );

  //   if (!confirmSend) {
  //     return; // Stop the process if user cancels
  //   }

  //   try {
  //     await sendEmails({ recipients: recipientList, subject, message });
  //     setStatus('Emails sent successfully!');
      
  //     // Reset all state values after successful email sending
  //     setRecipients('');
  //     setSubject('');
  //     setMessage('');
  //     setFile(null);
  //   } catch (err) {
  //     setStatus(`Error: ${err.message}`);
  //   }
  // };

  return (
    <div>
      <h2>Compose Email</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Recipient emails (comma-separated)"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        
        {/* File Upload Input */}
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />

        <button type="submit">Send Emails</button>
      </form>
      <p>{status}</p>
    </div>
  );
}

export default ComposeEmailPage;