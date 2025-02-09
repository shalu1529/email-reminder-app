const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const emailService = require('./services/emailService');
const reminderJob = require('./cronJobs/reminderJob');

dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

emailService.startIMAP();
emailService.scheduleReplyCheck();
reminderJob.start();

app.listen(3000, () => console.log('Server running on port 3000'));
