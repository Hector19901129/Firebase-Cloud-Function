'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
	const reader = context.auth.uid;
	const sender = data.sender;

	return markConversationAsReadPromise(reader, sender, reader).then(()=> {
		return markConversationAsReadPromise(reader, reader, sender);
	})
});

var markConversationAsReadPromise = (reader, sender, receiver) => {

	return new Promise((resolve, reject) => {

		admin.database().ref('messages/' + receiver + '/' + sender).once('value', (snapshot) => {

			snapshot.forEach((messageNode) => {
				if (messageNode.val().receiver === reader) {
					admin.database().ref('messages/' + receiver + '/' + sender + '/' + messageNode.key + '/isRead').set(true);
				}
			});

			resolve();
		});
	});
};
