const express = require('express');
const User = require('../modules/users');
const sentMail = require('../modules/sentMail');
const db = require('../config/dbConnection');
const nodemailer = '../modules/nodemailer.js';
const Joi = require('joi');
const MailerClass = require('../modules/nodemailer');
const { Router } = require('express');
const busboyBodyParser = require('busboy-body-parser');

const multer=require('multer');
const fs=require('fs');

const router = express.Router();
//parse multipart/form-data    
router.use(busboyBodyParser());

//Route for the home page
router.get('/', (req, res) => {
	res.render('sendMail');
});

router.get('/userForm', (req, res) => {
	res.render('userForm');
});

//Route to add User details, no page for it yet
router.post('/addUser', async (req, res) => {
	const userSchema = Joi.object({
		email    : Joi.string().email().trim().required(),
		password : Joi.string().trim().min(6).required(),
		hostmail : Joi.string().trim().required(),
		port     : Joi.string().trim().required()
	});

	try {
		const result = await userSchema.validateAsync(req.body);
		console.log(result);

		User.create({
			password : result.password,
			email    : result.email,
			host     : result.hostmail,
			port     : result.port
		})
			.then(function() {
				console.log('User Added');
				res.redirect('');
			})
			.catch((error) => {
				console.log('Error Occurred: ' + error);
			});
		res.redirect('/usertable');
	} catch (err) {
		console.log(err);
	}
});

router.get('/edit/:id', async (req, res) => {
	try {
		const user = await User.findOne({ where: { id: req.params.id } });
		console.log(user);
		res.render('editUser', { user });
	} catch (err) {
		console.log(err);
	}
});

router.put('/edit/:id', async (req, res) => {
	const userSchema = Joi.object({
		email    : Joi.string().email().trim().required(),
		password : Joi.string().trim().min(6).required(),
		host     : Joi.string().trim().required(),
		port     : Joi.string().trim().required()
	});
	const result = await userSchema.validateAsync(req.body);
	const { port, email, host, password } = result;
	try {
		const user = await User.findOne({ where: { id: req.params.id } });
		user.port = port;
		user.email = email;
		user.host = host;
		user.password = password;

		await user.save({ fields: [ 'port', 'email', 'host', 'password' ] });

		res.redirect('/usertable');
	} catch (err) {
		console.log(err);
	}
});

router.get('/delete/:id', async (req, res) => {
	try {
		const user = await User.findOne({ where: { id: req.params.id } });
		await user.destroy();
		res.redirect('/usertable');
	} catch (err) {
		console.log(err);
	}
});

//Route to add recipient detials
router.post('/add', async (req, res) => {
	console.log(req.body)

	const storage = multer.diskStorage({
		destination: function(req,file,callback){
			const dir = "uploads/";
			if(!fs.existsSync(dir)){
				fs.mkdirSync(dir);
			}
			callback(null,dir);
		},
		filename: function(req, file, callback) {
			callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
			}
	});

	var upload=multer({storage:storage}).array('files',10);

	upload(req,res,function(err) {
		if (err){
			console.log(err);
		}
	})

	const emailSchema = Joi.object({
		name        : Joi.string().trim().min(3).max(30).required(),
		email       : Joi.string().email().trim().required(),
		senderEmail : Joi.string().email().trim().required(),
		subject     : Joi.string().trim().required(),
		template    : Joi.string().trim().required(),
		files: Joi.any()
	});
	const result = await emailSchema.validateAsync(req.body);
	const { name, email, senderEmail, subject, template, files} = result;
	const errors = [];
	// if (!name || !email || !subject || !template) errors.push({ msg: 'All fields should be filled' });
	if (!name) errors.push({ msg: 'please input your name' });
	if (!email) errors.push({ msg: 'please input your email' });
	if (!subject) errors.push({ msg: 'please input your subject' });
	if (!template) errors.push({ msg: 'please input your template' });
	if (errors.length > 0) {
		res.render('sendMail', { errors });
	} else {
		//Class for creating a Sendmail record in the database
		sentMail;

		const data = {
			name     : name,
			email    : email,
			subject  : subject,
			template : template
		};
		sentMail
			.create({
				name     : name,
				email    : email,
				subject  : subject,
				template : template
			})
			.then(function() {
				console.log(senderEmail);
				User.findAll({ where: { email: senderEmail } })
					.then((projects) => {
						console.log('About to confirm details......');
						console.log(projects[0].dataValues);
						res.render('confirm.ejs', { data: data, projects: projects });
					})
					.catch((error) => {
						console.log(error);
						errors.push({ msg: 'Add user, Sender Email not Found, please add email' });
						res.render('userForm', { errors });
					});
			})
			.catch((error) => {
				console.log('Error Occurred: ' + error);
			});
	}
});

//Route to confirm Details and send email
router.post('/sendmail', (req, res) => {
	console.log('Packet data...........');
	const obj = JSON.parse(JSON.stringify(req.body));
	console.log(obj);

	User.findOne({ where: { email: obj.senderEmail } }).then((userDetails) => {
		console.log(userDetails);
		var pass = userDetails.password;

		let from = obj.senderName;
		let user = obj.senderEmail;
		let receiver = obj.recipientEmail;
		let subject = obj.subject;
		let body = obj.template;
		let template = obj.template;
		let host = obj.host;
		let port = obj.port;
		let password = pass;

		//Sending the mail with Nodemailer ({ from, receiver, subject, body, template, host, port, user, password })
		MailerClass.sendMails({ from, receiver, subject, body, template, host, port, user, password });

		res.redirect('/');
	});
});

module.exports = router;
