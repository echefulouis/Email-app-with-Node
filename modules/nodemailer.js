'use strict';
const nodemailer = require('nodemailer');

module.exports = class MailerClass {
	static async sendMails({ from, receiver, subject, body, template, host, port, user, password }) {
		// Generate test SMTP service account from ethereal.email
		// Only needed if you don't have a real mail account for testing
		// let testAccount = await nodemailer.createTestAccount();

		console.log({ host, port, user, password, from, receiver, subject, body, template });
		// create reusable transporter object using the default SMTP transport

		try {
			let transporter = nodemailer.createTransport({
				host   : host,
				// service : 'gmail',
				port   : port,
				secure : false, // true for 465, false for other ports
				auth   : {
					user : user,
					pass : password
				},
				tls    : {
					rejectUnauthorized : false
				}
			});

			// send mail with defined transport object
			let info = await transporter.sendMail({
				from    : `${from} <${user}>`, // sender address
				to      : receiver, // list of receivers
				subject : subject, // Subject line
				text    : template, // plain text body
				html    : body // html body
			});

			console.log('Message sent: %s', info.messageId);
			// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
		} catch (err) {
			console.log(err);
		}
	}
};
