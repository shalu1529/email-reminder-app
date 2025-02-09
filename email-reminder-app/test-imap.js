const Imap = require('node-imap');
require('dotenv').config();

const imap = new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    // debug: console.log,  // Enable debugging
});

const openInbox = (cb) => {
    imap.openBox('INBOX', false, cb);
};

imap.once('ready', () => {
    console.log("✅ IMAP connected!");

    openInbox((err, box) => {
        if (err) {
            console.error("❌ Error opening inbox:", err);
            return;
        }
        console.log("📂 INBOX opened!");

        imap.search(['UNSEEN'], (err, results) => {
            if (err) {
                console.error("❌ Search error:", err);
                return;
            }

            if (!results || results.length === 0) {
                console.log("📭 No unread emails.");
                return;
            }

            console.log(`📌 Found ${results.length} new emails.`);

            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg) => {
                msg.on('body', (stream) => {
                    let buffer = '';
                    stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });

                    stream.once('end', () => {
                        console.log("📜 Email content fetched:", buffer);
                    });
                });
            });

            fetch.once('error', (err) => {
                console.error("❌ Fetch error:", err);
            });

            fetch.once('end', () => {
                console.log("✅ Fetch complete.");
                imap.end();
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
