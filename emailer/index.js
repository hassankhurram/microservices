// Import necessary libraries
const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ejs = require('ejs');  // Import the ejs module
const path = require('path');  // Import the path module

dotenv.config();

const app = express();

// Parse application/json
app.use(express.json());
app.set('view engine', 'ejs');
const port = process.env.PORT || 6666;

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['*']
}));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000 * process.env.RATE_LIMIT_WINDOW_MINUTES, // 5 minute cooldown
  max: process.env.RATE_LIMIT_MAX, // limit each IP to specified requests per windowMs
  message: {
    message: "You've already sent a request, please try again later."
  },
  keyGenerator: function (req /*, res */) {
    return req.headers['x-real-ip'] || req.ip; // Use X-Real-IP if available, otherwise use req.ip
  }
});

app.use(limiter);

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE === 'true', // use SSL
  auth: {
    user: process.env.MAIL_AUTH_USER,
    pass: process.env.MAIL_AUTH_PASS,
  }
});

function sendMail(mail_to, mail_subject, message, callback) {
  // Configure the mailoptions object
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: mail_to,
    subject: mail_subject,
    html: message, // Use HTML instead of text for the email body
  };

  // Send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, info.response);
    }
  });
}

// Define a route to handle the form submission

app.post('/send-email', (req, res) => {

  console.log("req.body", req.body, req.ip);

  const { mail_to, message, name } = req.body;
  const mail_subject = `Inquiry from ${process.env.APP_NAME} visitor - ${name}`;

  if (!mail_to || !message || !name) {
    return res.status(400).json({
      message: 'Invalid request',
      error: 'Missing required fields',
    });
  }

  const emailHtmlPath = path.join(__dirname, 'views', 'email.ejs');

  ejs.renderFile(emailHtmlPath, { name, app_name: process.env.APP_NAME }, (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send({
        message: 'Error rendering email template',
      });
      return;
    } else {
      // Send confirmation email to the site owner
      sendMail(process.env.MAIL_TO, mail_subject, message, (error, info) => {
        if (error) {
          console.log("Error: sendMail(process.env.MAIL_TO", error);
          return res.status(500).json({
            message: 'Error sending email to site owner',
          });
        } else {
          console.log("info: sendMail(process.env.MAIL_TO", info);
        }
      });

      // Send confirmation email to the user
      sendMail(mail_to, `We have received your inquiry - ${process.env.APP_NAME}`, data, (error, info) => {
        if (error) {
          console.log("Error: sendMail(mail_to", error);
          return res.status(500).json({
            message: 'Error sending confirmation email to user',
          });
        } else {
          console.log("info: sendMail(mail_to", info);
          return res.json({
            message: 'Email sent',
          });
        }
      });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
