const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const dbConnection = require('./config/dbConnection').database;
const app = express();
const user = require('./modules/users');
const sentMail = require('./modules/sentMail');
const methodOverride = require('method-override');
var busboyBodyParser = require('busboy-body-parser');

app.set('view engine', 'ejs');

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
 
app.use(busboyBodyParser());

//Testing db
dbConnection
	.authenticate()
	.then(function() {
		console.log('Connected to Database.......');
	})
	.catch(function(err) {
		console.log('error: ' + err);
	});

//Routingcd
app.get('/', async (req, res) => {
	//Creating tables
	user.sync();
	sentMail.sync();

	await sentMail.findAndCountAll({}).then((result) => {
		res.render('home.ejs', { count: result.count, data: result.rows });
	});
});

app.get('/usertable', async (req, res) => {
	//Fetch Users

	await user.findAndCountAll({}).then((result) => {
		res.render('home2', { count: result.count, data: result.rows });
	});
});

app.get('/edit/:id', async (req, res) => {
	try {
		const mail = await sentMail.findOne({ where: { id: req.params.id } });
		res.render('edit', { mail });
	} catch (err) {
		console.log(err);
	}
});

app.put('/edit/:id', async (req, res) => {
	const emailSchema = Joi.object({
		name     : Joi.string().trim().min(3).max(30).required(),
		email    : Joi.string().email().trim().required(),
		subject  : Joi.string().trim().required(),
		template : Joi.string().trim().required()
	});
	const result = await emailSchema.validateAsync(req.body);
	const { name, email, senderEmail, subject, template } = result;
	const mail = await sentMail.findOne({ where: { id: req.params.id } });

	const errors = [];
	if (!name || !email || !subject || !template) errors.push({ msg: 'All fields should be filled' });
	// if (!email) errors.push({ msg: 'please input your email' });
	// if (!subject) errors.push({ msg: 'please input your subject' });
	// if (!template) errors.push({ msg: 'please input your template' });

	if (errors.length > 0) {
		res.render('edit', { mail, errors });
	} else {
		try {
			const mail = await sentMail.findOne({ where: { id: req.params.id } });
			mail.name = name;
			mail.email = email;
			mail.subject = subject;
			mail.template = template;

			await mail.save({ fields: [ 'name', 'email', 'subject', 'template' ] });

			res.redirect('/');
		} catch (err) {
			console.log(err);
		}
	}
});

app.get('/delete/:id', async (req, res) => {
	try {
		const mail = await sentMail.findOne({ where: { id: req.params.id } });
		console.log(mail);
		await mail.destroy();
		res.redirect('/');
	} catch (err) {
		console.log(err);
	}
});
//Routing
app.use('/user', require('./routes/user'));

//Listen to Port
app.listen(3000, (req, res) => {
	console.log('Started on Port: 3000');
});
