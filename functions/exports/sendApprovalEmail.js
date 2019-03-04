'use strict';

const moment = require('moment');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const nodemailer = require('nodemailer');
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

//console.log('gmailEmail', functions.config().gmail.email);
//console.log('gmailPassword', functions.config().gmail.password);

const mailTransport = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: gmailEmail,
		pass: gmailPassword,
	},
});
const fs = require('fs');

var getEmailTemplatePromise = new Promise((resolve, reject) => {
	fs.readFile('etc/email_template.html', (err, text) => {
		if (err) {
			reject(err);
		} else {
			resolve(text.toString());
		}
	});
});

var getStudentPromise = (student_id) => {

	return new Promise((resolve, reject) => {
		admin.database().ref('students/' + student_id).once('value', (snapshot) => {
			resolve(snapshot.val());
		});
	});
};

var getParentPromise = (parent_id) => {

	return new Promise((resolve, reject) => {
		admin.database().ref('parents/' + parent_id).once('value', (snapshot) => {
			resolve(snapshot.val());
		});
	});
};

function sendPushTo(token, title, body) {

	var message = {
		/*notification: {
			title: title,
			body: body
		},*/
		token: token,
		apns: {
			payload: {
				aps: {
					alert: {
						title: title,
						body: body
					},
					sound: 'default'
				}
			}
		}
	};

	admin.messaging().send(message).then((response) => {
		return;
	}).catch((error) => {
		console.log("ZP Error", message);
	});
}

function sendApprovalEmail(leaveObject, leave_id, studentObject, parentObject, htmlText, momOrDad) {

	var email = parentObject.email;

	console.log('email', email);
	const mailOptions = {
		from: 'WaveApp <noreply@firebase.com>',
		to: email,
	};

	mailOptions.subject = `Leave requested!`;

	htmlText = htmlText.replace('{{parent_name}}', parentObject.first_name);
	htmlText = htmlText.replace('{{requester_name}}', studentObject.first_name + ' ' + studentObject.last_name);
	htmlText = htmlText.replace('{{student_name}}', studentObject.first_name + ' ' + studentObject.last_name);

	htmlText = htmlText.replace('{{leave_type}}', leaveObject.type);
	htmlText = htmlText.replace('{{leave_by}}', leaveObject.transportation);
	htmlText = htmlText.replace('{{return_by}}', leaveObject.return_transportation);

	let m1 = moment(new Date(leaveObject.start_date * 1000)).utcOffset('-0500');
	let m2 = moment(new Date(leaveObject.end_date * 1000)).utcOffset('-0500');

	htmlText = htmlText.replace('{{start_date}}', m1.format('MMM DD, YYYY     HH:mm'));
	htmlText = htmlText.replace('{{end_date}}', m2.format('MMM DD, YYYY     HH:mm'));

	htmlText = htmlText.replace('{{host}}', leaveObject.host);
	htmlText = htmlText.replace('{{leave_destination}}', leaveObject.location);
	htmlText = htmlText.replace('{{notes}}', leaveObject.notes);

	htmlText = htmlText.replace('leaveRequestId1', leave_id);
	htmlText = htmlText.replace('leaveRequestId1', leave_id);
	htmlText = htmlText.replace('leaveRequestId2', leave_id);
	htmlText = htmlText.replace('leaveRequestId2', leave_id);

	htmlText = htmlText.replace('studentId1', leaveObject.student_id);
	htmlText = htmlText.replace('studentId1', leaveObject.student_id);
	htmlText = htmlText.replace('studentId2', leaveObject.student_id);
	htmlText = htmlText.replace('studentId2', leaveObject.student_id);

	htmlText = htmlText.replace('confirmby', momOrDad);
	htmlText = htmlText.replace('confirmby', momOrDad);
	htmlText = htmlText.replace('confirmby', momOrDad);
	htmlText = htmlText.replace('confirmby', momOrDad);

	mailOptions.html = htmlText;

	
	return mailTransport.sendMail(mailOptions).then(() => {
		return console.log('Approval request email has been sent to ', email);
	}).catch(err => {
		console.log('mailTransport error', err);
	});
}

exports = module.exports = functions.database.ref('/newleaves/{studentId}/{leaveId}').onWrite((snapshot, context) => {


	console.log('document writeed');
	if (snapshot.before._data !== null && 
		snapshot.after._data !== null) {

		var oldStatus = snapshot.before._data.status;
		var newStatus = snapshot.after._data.status;

		if(oldStatus === newStatus) {
			return "Skip";
		}
	}

	leave_id = context.params.leaveId;
	leave = snapshot.after._data;



	var facultyApprovalStatus = (leave.status&0xF00)>>8;
	var momApprovalStatus = (leave.status&0x0F0)>>4;
	var dadApprovalStatus = (leave.status&0x00F);


	console.log('facultyApprovalStatus', facultyApprovalStatus);
	console.log('momApprovalStatus', momApprovalStatus);
	console.log('dadApprovalStatus', dadApprovalStatus);
	// Sending email notification 
	{
		if (facultyApprovalStatus !== 1 && 
			momApprovalStatus === 0 && 
			dadApprovalStatus === 0) {

			// if staus is pending
			let parents = [];

			return getEmailTemplatePromise.then((htmlText) => {
				html = htmlText;
				return getStudentPromise(leave.student_id);
			}).then((studentObject) => {
				student = studentObject;
				return getParentPromise(studentObject.parents[0]);
			}).then((mom) => {
				parents.push(mom);
				return getParentPromise(student.parents[1]);
			}).then((dad) => {
				parents.push(dad);
				return sendApprovalEmail(leave, leave_id, student, parents[0], html, "mom");
			}).then((obj) => {
				return sendApprovalEmail(leave, leave_id, student, parents[1], html, "dad");
			});
		}
	}

	// Sending push notification
	{
		if (facultyApprovalStatus !== 1) {

			// Declined by faculty
			return getStudentPromise(leave.student_id).then((studentObject) => {
				student = studentObject;
				return sendPushTo(student.fcmToken, "Leave Approved", 
					"Your " + leave.type + " from " + leave.start_date.replace(/\s\s+/g, ' ') + 
					" to " + leave.end_date.replace(/\s\s+/g, ' ') + " has been declined by faculty.");
			});	
		}

		if (momApprovalStatus === 1 || 
			dadApprovalStatus === 1) {

			// Declined by Mom or Dad
			return getStudentPromise(leave.student_id).then((studentObject) => {
				student = studentObject;

				if (momApprovalStatus === 1)
					return getParentPromise(studentObject.parents[0]);
				else
					return getParentPromise(studentObject.parents[1]);

			}).then((parent) => {

				return sendPushTo(student.fcmToken, "Leave Approved", 
					"Your " + leave.type + " from " + leave.start_date.replace(/\s\s+/g, ' ') + 
					" to " + leave.end_date.replace(/\s\s+/g, ' ') + " has been declined by " + 
					(parent.first_name) + " " + (parent.last_name) + ".");
			});	
		}

		if (facultyApprovalStatus === 2 &&
			(momApprovalStatus === 2 || 
			dadApprovalStatus === 2)) {

			return getStudentPromise(leave.student_id).then((studentObject) => {

				student = studentObject;
				return sendPushTo(student.fcmToken, "Leave Approved", 
					"Your " + leave.type + " from " + leave.start_date.replace(/\s\s+/g, ' ') + 
					" to " + leave.end_date.replace(/\s\s+/g, ' ') + " has been approved.");
			});
		}
	}

	return '';
});
