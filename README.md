📧 Automated Sent Mail Reply Checker

This Node.js script automatically checks sent emails using IMAP and updates the database to mark recipients as "replied." The process runs at a fixed interval (default: every 1 minute) and interacts with a MongoDB database.

🚀 Features

- Periodically checks sent emails from Gmail.
- Extracts recipient emails from To, Cc, and Bcc fields.
- Cross-checks with a MongoDB database.
- Updates the replied status of recipients.
- Uses IMAP protocol for fetching emails securely.

🛠️ Installation & Setup

1 Clone the Repository

- git clone https://github.com/shalu1529/email-reminder-app.git
- cd email-reminder-app

2️ Install Dependencies

npm install

3️ Environment Variables (.env)

Create a .env file and add the following details:

-IMAP_USER=your-email@gmail.com
-IMAP_PASS=your-email-password
-MONGO_URI=mongodb+srv://your-mongodb-uri

👉 Important: Use App Passwords for Gmail instead of your real password.

4️ Run the Script

node server.js

⚙️ How It Works

- The script runs every 1 minute (setInterval).2
- It connects to Gmail’s Sent Mail folder using IMAP.
- It fetches sent emails from the last 24 hours.
- It extracts recipient email addresses from To, Cc, and Bcc fields.
- It searches the database to see if the email exists.
- If found, it marks the email as replied.7
- The script logs the status and closes the IMAP connection after completion.


🛠 Dependencies

imap - Access Gmail via IMAP.

mongoose - MongoDB ORM for handling database.

dotenv - Load environment variables securely.

📝 Important Notes

Ensure IMAP access is enabled in your Gmail settings.

If using Gmail, consider OAuth authentication instead of a password for better security.

Modify the interval duration inside the setInterval() function to adjust the frequency.
