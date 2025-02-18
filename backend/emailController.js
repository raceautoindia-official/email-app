const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { convert } = require('html-to-text');  // Import html-to-text
require('dotenv').config();

const sesClient = new SESClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function sendBulkEmails(recipients, subject, message) {
  const results = [];
  let count = 0;

  // Convert HTML to Plain Text
  const plainTextMessage = convert(message, { wordwrap: 130 });

  for (const recipient of recipients) {
    count++;
    console.log("sending count: ", count);
    const params = {
      Source: `"Race Auto India" <${process.env.SENDER_EMAIL}>`,
      Destination: {
        ToAddresses: [recipient],
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: {
            Data: message,  // Use the HTML message body
            Charset: 'UTF-8',
          },
          Text: {
            Data: plainTextMessage,  // Now contains a proper plain-text version
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: [process.env.SENDER_EMAIL],
      Headers: {
        'List-Unsubscribe': `<mailto:info@raceautoindia.com>`,
      },
    };

    try {
      const command = new SendEmailCommand(params);
      const result = await sesClient.send(command);
      results.push({ result });
    } catch (err) {
      results.push({ err });
    }
  }

  console.log(results[0].result);
  return results;
}

module.exports = { sendBulkEmails };


// const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
// require('dotenv').config();

// const sesClient = new SESClient({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// async function sendBulkEmails(recipients, subject, message) {
//   const results = [];
//   let count = 0;
//   for (const recipient of recipients) {
//     count++;
//     console.log("sending count: ", count);
//     const params = {
//       Source:`"Race Auto India" <${process.env.SENDER_EMAIL}>`,
//       Destination: {
//         ToAddresses: [recipient],
//       },
//       Message: {
//         Subject: { Data: subject },
//         Body: {
//           Html: {
//             Data: message,  // Use the HTML message body
//             Charset: 'UTF-8',
//           },
//           // Optional: You can still provide a fallback plain-text version
//           Text: {
//             Data: message,  // Plain-text version of the message (for clients that don't support HTML)
//             Charset: 'UTF-8',
//           },
//         },
//       },
//       ReplyToAddresses: [process.env.SENDER_EMAIL],
//       Headers: {
//         'List-Unsubscribe': `<mailto:info@raceautoindia.com>`,
//       },
//       // list-Unsubscribe optional code to URL re-direct <https://yourdomain.com/unsubscribe?email=${recipient}>
//     };

//     try {
//       const command = new SendEmailCommand(params);
//       const result = await sesClient.send(command);
//       results.push({ result });
//     } catch (err) {
//       results.push({ err });
//     }
//   }

//   console.log(results[0].result);
//   return results;
// }

// module.exports = { sendBulkEmails };



