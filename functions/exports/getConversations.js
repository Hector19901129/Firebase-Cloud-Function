'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

var findUserPromise = (userId) => {
	return new Promise((resolve, reject) => {
		admin.database().ref('students/' + userId).once('value', (snapshot) => {
			if(snapshot.val() !== null) {
				resolve(snapshot.val());
			} else {
				admin.database().ref('faculty/' + userId).once('value', (snapshot) => {
					resolve(snapshot.val());
				});
			}
		});
	});
}

var getUserPromise = (userId) => {

	return new Promise((resolve, reject) => {

		return findUserPromise(userId).then((user) => {

			conversations.forEach((conv) => {
				if(conv.user.id === userId) {
					conv.user.name = user.first_name + ' ' + user.last_name;
					conv.user.profile_picture = user.profile_picture;
					resolve(user);
					return;
				}
			});

			return;
		});
	});
}

var conversations = [];

var getConversationsPromise = (uid) => {

	return new Promise((resolve, reject) => {

		admin.database().ref('messages/' + uid).once('value', (snapshot) => {

			var promises = [];
			snapshot.forEach((conversation) => {

				var userId = conversation.key;
				var count = 0;
				var lastMessage = null;
				conversation.forEach((messageNode) => {

					if (messageNode.val().receiver === uid) {
						lastMessage = messageNode.val();
						lastMessage.messageId = messageNode.key;
						if(lastMessage.isRead === false) {
							count++;
						}
					}

				});

				conversations.push({
					user: { id: userId },
					last: lastMessage,
					unreads: count
				});

				promises.push(getUserPromise(userId));
			});

			return Promise.all(promises).then((result) => {
				resolve(result);
				return '';
			});
		});
	});
};

exports = module.exports = functions.https.onCall((data, context) => {

	const uid = context.auth.uid;
	conversations = [];

	return getConversationsPromise(uid).then((result) => {
		return conversations;
	});
});
