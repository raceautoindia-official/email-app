const express = require('express');
const cors = require('cors');
const { sendBulkEmails } = require('./emailController');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json()); // For SNS POST requests

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

app.get("/test", (req, res) => {
  console.log("url is working");
  res.json({ message: "API is working!" });
});

// Route to handle unsubscribe requests
app.get('/unsubscribe', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('<p>Email query parameter is required.</p>');
  }

  try {
    // Check if the email exists in the users table (optional, but useful for validation)
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      // Insert the email into the unsubscribe table instead of updating users
      await pool.query('INSERT INTO unsubscribe (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);

      res.send(`<p>${email} has been unsubscribed successfully.</p>`);
    } else {
      res.status(404).send('<p>Email not found in our list.</p>');
    }
  } catch (err) {
    console.error('Error during unsubscribe:', err.message);
    res.status(500).send('<p>Error processing unsubscribe request.</p>');
  }
});

const getRawBody = require('raw-body');

app.post('/ses-events', async (req, res) => {
    // Get the raw body
    console.log(req.headers,req.body);
    getRawBody(req, { encoding: 'utf-8' }, async (err, body) => {
        if (err) {
            console.error('Error reading raw body:', err.message);
            return res.status(400).send('Error reading body');
        }

        console.log('Raw body received:', body); // Log raw body for debugging

        try {
            const snsMessage = JSON.parse(body);  // Parse the raw body as JSON

            console.log("Raw SNS Event:", JSON.stringify(snsMessage, null, 2));

            if (snsMessage.Type === "SubscriptionConfirmation") {
                console.log("SNS Subscription Confirmation received:", snsMessage);

                try {
                    await axios.get(snsMessage.SubscribeURL);
                    console.log("Subscription confirmed successfully.");
                } catch (error) {
                    console.error("Subscription confirmation failed:", error.message);
                    return res.status(500).send("Failed to confirm subscription.");
                }

                return res.status(200).send("Subscription confirmed.");
            }

            // Safely parse SNS message
            let message;
            try {
                message = JSON.parse(snsMessage.Message);
            } catch (error) {
                console.error("Failed to parse SNS message:", error.message);
                return res.status(400).send("Invalid SNS message format.");
            }

            const bounceType = message.bounce?.bounceType || message.complaint?.complaintFeedbackType;

            if (bounceType) {
                // Handle Bounce
                if (bounceType === 'Permanent') {
                    const email = message.bounce?.bouncedRecipients?.[0]?.emailAddress;
                    if (email) {
                        try {
                            await pool.query('INSERT INTO hard_bounce (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
                            console.log(`Hard Bounce: Added ${email} to hard_bounce table.`);
                        } catch (dbError) {
                            console.error("Database error inserting hard bounce:", dbError.message);
                        }
                    }
                } else if (bounceType === 'Transient') {
                    console.log('Soft Bounce: Retry sending after delay.');
                }
            } else if (message.complaint) {
                // Handle Complaint
                const email = message.complaint?.complainedRecipients?.[0]?.emailAddress;
                if (email) {
                    try {
                        await pool.query('INSERT INTO complaint (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
                        console.log(`Complaint: Added ${email} to complaint table.`);
                    } catch (dbError) {
                        console.error("Database error inserting complaint:", dbError.message);
                    }
                }
            }

            res.status(200).send('Processed SNS message');
        } catch (error) {
            console.error("Error processing SNS event:", error.message);
            res.status(400).send("Failed to process SNS event");
        }
    });
});


// app.post('/ses-events', async (req, res) => {
//   try {
//     const snsMessage = req.body;
//     console.log('Request Headers:', req.headers);
//     console.log('Request Body:', req.body); 

//     // Safely parse SNS message
//     let message;
//     try {
//       message = JSON.parse(snsMessage.Message);
//     } catch (error) {
//       console.error("Failed to parse SNS message:", error.message);
//       return res.status(400).send("Invalid SNS message format.");
//     }

//     const bounceType = message.bounce?.bounceType || message.complaint?.complaintFeedbackType;

//     if (bounceType) {
//       // Handle Bounce
//       if (bounceType === 'Permanent') {
//         const email = message.bounce?.bouncedRecipients?.[0]?.emailAddress;
//         if (email) {
//           try {
//             await pool.query('INSERT INTO hard_bounce (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
//             console.log(`Hard Bounce: Added ${email} to hard_bounce table.`);
//           } catch (dbError) {
//             console.error("Database error inserting hard bounce:", dbError.message);
//           }
//         }
//       } else if (bounceType === 'Transient') {
//         console.log('Soft Bounce: Retry sending after delay.');
//       }
//     } else if (message.complaint) {
//       // Handle Complaint
//       const email = message.complaint?.complainedRecipients?.[0]?.emailAddress;
//       if (email) {
//         try {
//           await pool.query('INSERT INTO complaint (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
//           console.log(`Complaint: Added ${email} to complaint table.`);
//         } catch (dbError) {
//           console.error("Database error inserting complaint:", dbError.message);
//         }
//       }
//     }

//     res.status(200).send('Event processed.');
//   } catch (error) {
//     console.error("Error handling SES event:", error.message);
//     res.status(500).send("Internal Server Error");
//   }
// });

// Route to handle SES Bounce and Complaint Notifications
// app.post('/ses-events', async (req, res) => {
//   const snsMessage = req.body;

//   if (snsMessage.Type === "SubscriptionConfirmation") {
//     console.log("SNS Subscription Confirmation received:", snsMessage);
    
//     // Confirm subscription by making a GET request to SubscribeURL
//     const axios = require('axios');
//     await axios.get(snsMessage.SubscribeURL);
    
//     return res.status(200).send("Subscription confirmed");
//   } 

//   // Parse SNS message and handle bounce/complaint events
//   const message = JSON.parse(snsMessage.Message);
//   const bounceType = message.bounce?.bounceType || message.complaint?.complaintFeedbackType;

//   if (bounceType) {
//     // Handle Bounce
//     if (bounceType === 'Permanent') {
//       // Hard Bounce: Add user to hard_bounce table
//       const email = message.bounce.bouncedRecipients[0].emailAddress;
//       await pool.query('INSERT INTO hard_bounce (email) VALUES ($1)', [email]);
//       console.log(`Hard Bounce: Added ${email} to hard_bounce table.`);
//     } else if (bounceType === 'Transient') {
//       // Handle soft bounce (retry sending, but can remove after multiple failures)
//       console.log('Soft Bounce: Retry sending after delay.');
//     }
//   } else if (message.complaint) {
//     // Handle Complaint: Add user to complaint table
//     const email = message.complaint.complainedRecipients[0].emailAddress;
//     await pool.query('INSERT INTO complaint (email) VALUES ($1)', [email]);
//     console.log(`Complaint: Added ${email} to complaint table.`);
//   }

//   res.status(200).send('Event processed.');
// });

// Route to get emails
app.get('/emails', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM emails');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send', async (req, res) => {
  const { recipients, subject, message } = req.body;

  try {
    console.log("starting email sending process");
    const result = await sendBulkEmails(recipients, subject, message);
    console.log("result",result);  
    // await pool.query('INSERT INTO emails (recipients, subject, message, status) VALUES ($1, $2, $3, $4)',
    // [recipients.join(', '), subject, message, 'Sent']);
    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
    console.log(err.message)
  }
});


// Route for user login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const hardcodedUser = { email: 'admin@example.com', password: 'password' };

  if (email === hardcodedUser.email && password === hardcodedUser.password) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});


// const express = require('express');
// const cors = require('cors');
// const { sendBulkEmails } = require('./emailController');
// const pool = require('./db');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const authenticate = (req, res, next) => {
//   console.log(req.headers.authorization)
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Unauthorized' });

//   try {
//     jwt.verify(token, process.env.JWT_SECRET);
//     next();
//   } catch (err) {
//     res.status(403).json({ message: 'Invalid token' });
//   }
// };

// app.get('/unsubscribe', async (req, res) => {
//   const { email } = req.query;

//   if (!email) {
//     return res.status(400).send('<p>Email query parameter is required.</p>');
//   }

//   try {
//     const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

//     if (result.rows.length > 0) {
//       await pool.query('UPDATE users SET subscribed = false WHERE email = $1', [email]);
//       res.send(`<p>${email} has been unsubscribed successfully.</p>`);
//     } else {
//       res.status(404).send('<p>Email not found in our list.</p>');
//     }
//   } catch (err) {
//     console.error('Error during unsubscribe:', err.message);
//     res.status(500).send('<p>Error processing unsubscribe request.</p>');
//   }
// });

// app.get('/emails', authenticate, async (req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM emails');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post('/login', (req, res) => {
//   const { email, password } = req.body;
//   const hardcodedUser = { email: 'admin@example.com', password: 'password' };

//   if (email === hardcodedUser.email && password === hardcodedUser.password) {
//     const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.json({ token });
//   } else {
//     res.status(401).json({ message: 'Invalid credentials' });
//   }
// });

// app.listen(5000, () => {
//   console.log('Server running on port 5000');
// });
