const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const sender = context.auth.uid;
    const { groupId, message, timestamp, avatar, senderName } = data;

    const newGroupMessage = {sender, message, updatedAt: timestamp, avatar, senderName };

    return admin.database().ref(`groupMessage/${groupId}`).push(newGroupMessage)
      .then(_ => {
          return admin.database().ref(`groupDetail/${groupId}`).once('value')
      }).then((snapshot) => {
          const { members } = snapshot.val();

          let promises = Object.keys(members).map((memberId) => {
              const { fcmToken, isStudent, lastSeen } = members[memberId];

              return calculateUnreadCounts(groupId, memberId, lastSeen, isStudent).then((unreadCount) => {
                  return sendPushNotificationTo(fcmToken,
                    {'id': sender, 'name': senderName, 'picture': avatar},
                    senderName, data.message, unreadCount, unreadCount);
              });
          });

          promises.push(admin.database().ref(`groupDetail/${groupId}`).update({ updatedAt: timestamp, lastMessage: newGroupMessage }));

          return Promise.all(promises)
      }).then((snapshot) => {
          return { result: 'Success' }
      });
});

function sendPushNotificationTo(token, sender, title, body, unreads, badgeCount) {
    var message = {
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

    return admin.messaging().send(message).then((response) => {
        return {'result' : 'success'};
    }).catch((error) => {
        return {'result' : 'failed', 'error' : 'Failed to send push notification'};
    });
}

const calculateUnreadCounts = (groupId, receiverId, lastSeen, isStudent) => {
    let unreadCount = 0;

    return admin.database().ref(`groupMessage/${groupId}`).once('value')
      .then((snapshot) => {
          snapshot.forEach((conversation) => {
              if((new Date(conversation.val().timestamp)).getTime() > (new Date(lastSeen)).getTime()) {
                  unreadCount++;
              }
          });

          const userType = isStudent ? 'students/' : 'faculty/';

          return admin.database().ref(`${userType}/${receiverId}/groups/${groupId}`).update({ unreads: unreadCount })
            .then((snapshot) => {
                return unreadCount;
            })
      });
};
