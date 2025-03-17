const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('alertsbilling', cloudEvent => {
    // The Pub/Sub message is passed as the CloudEvent's data payload.

    const rawData = cloudEvent.data.message.data ? Buffer.from(cloudEvent.data.message.data, 'base64').toString() : null;
    if (rawData) {
        const parsedData = JSON.parse(rawData);
        if (parsedData) {
            const {
                budgetDisplayName,
                costAmount,
                costIntervalStart,
                budgetAmount,
                budgetAmountType,
                alertThresholdExceeded,
                forecastThresholdExceeded,
                currencyCode
            } = parsedData;

            const transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                secure: process.env.MAIL_SECURE === 'true', // use SSL
                auth: {
                    user: process.env.MAIL_AUTH_USER,
                    pass: process.env.MAIL_AUTH_PASS,
                }
            });

            const templatePath = path.join(__dirname, 'emailTemplate.ejs');

            // Render the EJS template with data
            ejs.renderFile(templatePath, {
                budgetDisplayName,
                costAmount,
                costIntervalStart,
                budgetAmount,
                budgetAmountType,
                alertThresholdExceeded,
                forecastThresholdExceeded,
                currencyCode
            }, (err, html) => {
                if (err) {
                    console.error('Error rendering EJS template:', err);
                    return;
                }

                const mailOptions = {
                    from: process.env.MAIL_FROM,
                    to: process.env.MAIL_TO,
                    subject: "Budget Email Alert",
                    html: html, // Use HTML instead of text for the email body
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.error('Error sending email:', error);
                        return;
                      }
                      console.log('Message sent: %s', html);
                });


            });

        }
        else console.error("There was something wrong with parsedData, here's the raw data", rawData);
    }
    else console.error("There was something wrong with rawData")
});
