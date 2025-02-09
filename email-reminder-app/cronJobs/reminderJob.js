const cron = require('node-cron');
const transporter = require('../config/mailConfig');
const EmailEntry = require('../models/emailModel');

const start = () => {
  cron.schedule('* * * * *', async () => {
    
    const pendingEmails = await EmailEntry.find({ replied: false });

    pendingEmails.forEach(email => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `Reminder: Reply to ${email.email}`,
        text: `You received an email from ${email.name} (${email.email}) at ${email.receivedAt}. Please reply!`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`Error sending reminder: ${error}`);
        } else {
          console.log(`Reminder sent: ${info.response}`);
        }
      });
    });
  });
};

module.exports = { start };
