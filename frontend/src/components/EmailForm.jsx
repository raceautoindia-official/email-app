import { useState } from 'react';
import { sendEmails } from '../services/api';
import styles from '../styles/EmailForm.module.css';
import { FaPaperPlane } from 'react-icons/fa';

function EmailForm() {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!recipients || !subject || !message) {
      setStatus('Please fill in all fields.');
      return;
    }

    const recipientList = recipients.split(',').map(email => email.trim());

    setLoading(true);
    try {
      const result = await sendEmails({ recipients: recipientList, subject, message });
      setStatus('Emails sent successfully!');
      setRecipients('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.heading}>Send Bulk Emails</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label htmlFor="recipients" className={styles.label}>Recipient Emails (Comma-Separated):</label>
        <textarea
          id="recipients"
          className={styles.input}
          placeholder="Enter recipient emails here"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />
        
        <label htmlFor="subject" className={styles.label}>Subject:</label>
        <input
          type="text"
          id="subject"
          className={styles.input}
          placeholder="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        
        <label htmlFor="message" className={styles.label}>Message:</label>
        <textarea
          id="message"
          className={styles.input}
          placeholder="Write your message here"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Sending...' : <><FaPaperPlane /> Send Emails</>}
        </button>
      </form>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}

export default EmailForm;

