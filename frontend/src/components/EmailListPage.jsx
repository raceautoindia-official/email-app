import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function EmailListPage() {
  const [emails, setEmails] = useState([]);
  const [isAuthenticated,setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchEmails = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:5000/emails', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsAuthenticated(true);
        setEmails(response.data);
      } catch (error) {
        setIsAuthenticated(false);
        console.log(error);
      }
    }
    fetchEmails();
  }, []);

  return (
    <div>
      {isAuthenticated?(
        <div>
          <h2>Email List</h2>
          <ul>
            {emails.map((email) => (
              <li key={email.id}>{email.recipients}</li>
            ))}
          </ul>
          <Link to="/compose">
            <button>Compose Email</button>
          </Link>
        </div>
      ):(
          <p>You are not authenticated. Please log in to view emails.</p>
      )}
        
    </div>
  );
}

export default EmailListPage;
