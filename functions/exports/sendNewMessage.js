'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {

	/*
		data = {
			'sender' : String (fullname)
			'avatar': String
			'receiver' : uid,
			'message' : String,
			'timestamp' : Double
		}
	*/
	const senderUid = context.auth.uid;
	const receiverUid = data.receiver;
	const senderName = data.sender;

	var receiverFcmToken;
	var newChatMessage = {
		sender : senderUid,
		receiver : receiverUid,
		message : data.message,
		timestamp : data.timestamp,
		isRead : false,
	};

	const senderInbox = 'messages/' + senderUid + '/' + receiverUid;
	const receiverInbox = 'messages/' + receiverUid + '/' + senderUid;

	return admin.database().ref(senderInbox).push(newChatMessage).then((snapshot) => {
		return admin.database().ref(receiverInbox).push(newChatMessage);
	}).then((snapshot) => {
		return getReceiverFCMToken(receiverUid);
	}).then((token) => {
		receiverFcmToken = token;
		return calculateUnreadCounts(senderUid, receiverUid);
	}).then((counts) => {
		return sendPushNotificationTo(receiverFcmToken, 
									{'id':senderUid, 'name':senderName, 'picture':data.avatar},
									senderName, data.message, counts[0], counts[1]);
	});
});

function sendPushNotificationTo(token, sender, title, body, unreads, badgeCount) {

	var message = {
		/*notification: {
			title: title,
			body: body
		},*/
		token: token,
		data: {
			category: 'messaging',
			senderId: sender.id,
			senderName: sender.name,
			senderPicture: sender.picture,
			unreads: String(unreads),
			badge: String(badgeCount)
		},
		apns: {
			payload: {
				aps: {
					alert: {
						title: title,
						body: body
					},
					badge: badgeCount,
					sound: 'default'
				}
			}
		}
	};

	//console.log("notifcation ready to send", message);

	admin.messaging().send(message).then((response) => {
		//console.log("notification sent", message);
	    return {'result' : 'success'};
	}).catch((error) => {
		console.log("notification failed", error);
		return {'result' : 'failed', 'error' : 'Failed to send push notification'};
	});
}

var getReceiverFCMToken = (receiverUid) => {
	return new Promise((resolve, reject) => {
		admin.database().ref('students/' + receiverUid).once('value', (snapshot) => {
			if(snapshot.val() !== null) {
				resolve(snapshot.val().fcmToken);
			} else {
				admin.database().ref('faculty/' + receiverUid).once('value', (snapshot) => {
					resolve(snapshot.val().fcmToken);
				});
			}
		});
	});
}

var calculateUnreadCounts = (senderUid, receiverUid) => {

	return new Promise((resolve, reject) => {

		var unreadCount = 0, badgeCount = 0;

		admin.database().ref('messages/' + receiverUid).once('value', (snapshot) => {
			snapshot.forEach((conversation) => {

				var userId = conversation.key;
				var count = 0;
				conversation.forEach((messageNode) => {
					var message = messageNode.val();
					if(message.isRead === false) {
						count++;
					}
				});

				if(userId === senderUid) {
					unreadCount = count;
				}

				badgeCount = badgeCount + count;
			});

			resolve([unreadCount, badgeCount]);
		});
	});
}

