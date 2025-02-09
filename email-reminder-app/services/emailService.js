const Imap = require('node-imap');
const EmailEntry = require('../models/emailModel');
require('dotenv').config();

let firstRun = true; // Process all unread emails only on first execution

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true
};

const imap = new Imap(imapConfig);

const openInbox = (cb) => {
  imap.openBox('INBOX', false, cb);
};

const getLastProcessedTime = async () => {
  const latestEmail = await EmailEntry.findOne().sort({ receivedAt: -1 });
  return latestEmail ? latestEmail.receivedAt : new Date();
};

const startIMAP = () => {
  imap.once('ready', async () => {
    console.log("✅ IMAP connected!");

    openInbox(async (err, box) => {
      if (err) {
        console.error("❌ Error opening inbox:", err);
        return;
      }
      console.log("📂 INBOX opened!");

      const lastProcessedTime = await getLastProcessedTime();
      console.log("⏳ Last processed email timestamp:", lastProcessedTime);

      // Fetching ALL UNREAD emails
      imap.search(['UNSEEN'], async (err, results) => {
        if (err) {
          console.error("❌ Search error:", err);
          return;
        }

        if (!results || results.length === 0) {
          console.log("📭 No new unread emails.");
          return;
        }

        console.log(`📌 Found ${results.length} new emails.`);

        const fetch = imap.fetch(results, { bodies: 'HEADER.FIELDS (FROM DATE SUBJECT)' });

        fetch.on('message', (msg, seqno) => {
          let sender = '', receivedAt = new Date(), subject = '';

          msg.on('body', (stream) => {
            let buffer = '';
            stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });

            stream.once('end', async () => {
              const fromMatch = buffer.match(/From:\s*(.*)<(.*)>/);
              const dateMatch = buffer.match(/Date:\s*(.*)/);
              const subjectMatch = buffer.match(/Subject:\s*(.*)/);

              if (fromMatch) {
                sender = fromMatch[2].trim();
                const name = fromMatch[1].trim();
                receivedAt = dateMatch ? new Date(dateMatch[1].trim()) : new Date();
                subject = subjectMatch ? subjectMatch[1].trim() : '(No Subject)';

                // Only process old emails on first run
                if (firstRun || receivedAt > lastProcessedTime) {
                  try {
                    const exists = await EmailEntry.findOne({ email: sender });
                    if (!exists) {
                      await EmailEntry.create({
                        name,
                        email: sender,
                        subject,
                        domain: sender.split('@')[1],
                        receivedAt
                      });

                      console.log(`✅ New email from ${sender} saved.`);
                    } else {
                      console.log(`⚠️ Email from ${sender} already exists, skipping.`);
                    }
                  } catch (err) {
                    console.error("❌ Database error:", err);
                  }
                } else {
                  console.log(`🔄 Skipping old email from ${sender}`);
                }
              } else {
                console.log("⚠️ Could not parse sender info.");
              }
            });
          });
        });

        fetch.once('error', (err) => {
          console.error("❌ Fetch error:", err);
        });

        fetch.once('end', () => {
          console.log("✅ Fetch complete.");
          firstRun = false; // Mark first run as completed
        });
      });
    });
  });

  imap.once('error', (err) => {
    console.error("❌ IMAP error:", err);
  });

  imap.once('end', () => {
    console.log("📴 Connection closed.");
  });

  imap.connect();
};

// Scheduled reply check
const scheduleReplyCheck = () => {
  setInterval(() => {
    const imap2 = new Imap(imapConfig);

    imap2.once('ready', () => {
      console.log("📤 Checking replies...");
      imap2.openBox('[Gmail]/Sent Mail', false, (err) => {
        if (err) {
          console.error('❌ Error opening Sent Mail:', err);
          imap2.end();
          return;
        }

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 1);
        const formattedDate = sinceDate.toUTCString().split(' ').slice(1, 4).join('-');
        let lastProcessedEmail = false;
        (async () => {
          lastProcessedEmail = await getLastProcessedEmail();
          console.log("📩 Last processed email:", lastProcessedEmail);
        })();


        if (!lastProcessedEmail) {
          console.log("📭 No previous email records found, checking all sent emails.");
        } else {
          console.log(`⏳ Checking sent emails SINCE: ${lastProcessedEmail.receivedAt}`);
        }

        const lastProcessedDate = lastProcessedEmail ? lastProcessedEmail.receivedAt.toUTCString().split(' ').slice(1, 4).join('-') : formattedDate;

        imap2.search([['SINCE', lastProcessedDate]], (err, results) => {

          if (err) {
            console.error('❌ Search error:', err);
            imap2.end();
            return;
          }

          if (!results || results.length === 0) {
            console.log('📭 No new sent emails.');
            imap2.end();
            return;
          }

          console.log(`📩 Checking ${results.length} new sent emails.`);

          const fetch = imap2.fetch(results, { bodies: ['HEADER.FIELDS (TO)'] });

          fetch.on('message', (msg) => {
            let buffer = '';

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', async () => {
                const matches = buffer.match(/(?:To|Cc|Bcc):\s*([^]*)/gi);
                let recipientEmails = [];
                if (matches) {
                  matches.forEach((match) => {
                    recipientEmails = recipientEmails.concat(
                      match
                        .replace(/(?:To|Cc|Bcc):/gi, '')
                        .split(',')
                        .map((email) => email.trim().replace(/<|>/g, ''))
                    );
                  });
                }

                console.log("📩 Extracted Recipients:", recipientEmails);

                const result = await EmailEntry.findOne({});
                console.log("🔥 Sample Email Entry from DB:", result);


                for (const recipientEmail of recipientEmails) {
                  if (typeof recipientEmail !== 'string') {
                    console.error("⚠️ Skipping invalid email format:", recipientEmail);
                    continue;
                  }

                  const recipientEmailClean = extractEmail(recipientEmail);
                  if (!recipientEmailClean) {
                    console.error("⚠️ Could not extract a valid email from:", recipientEmail);
                    continue;
                  }

                  console.log(`🔍 Searching for email: "${recipientEmailClean}"`);

                  const emailEntry = await EmailEntry.findOne({ email: recipientEmailClean });

                  if (!emailEntry) {
                    console.error(`❌ Email "${recipientEmailClean}" not found in DB`);
                  } else {
                    console.log(`✅ Found Email Entry:`, emailEntry);
                    await EmailEntry.findOneAndUpdate(
                      { email: recipientEmailClean },
                      { replied: true },
                      { new: true }
                    );
                    console.log(`✅ Marked ${recipientEmailClean} as replied.`);
                  }
                }

              });
            });
          });

          fetch.once('error', (err) => {
            console.error('❌ Fetch error:', err);
          });

          fetch.once('end', () => {
            console.log('✅ Reply check completed.');
            imap2.end();
          });
        });
      });
    });

    imap2.once('error', (err) => {
      console.error("❌ IMAP2 error:", err);
    });

    imap2.once('end', () => {
      console.log("📴 Reply check connection closed.");
    });

    imap2.connect();
  }, 60_000); // Run every 5 minutes  5 * 60 * 1000
};

const getLastProcessedEmail = async () => {
  return await EmailEntry.findOne({}, {}, { sort: { receivedAt: -1 } });
};

const extractEmail = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  return rawEmail
    .replace(/["']/g, '')
    .replace(/.*<(.+)>.*/g, '$1')
    .split(' ') 
    .pop()
    .trim() 
    .toLowerCase();
};

module.exports = { startIMAP, scheduleReplyCheck };
