const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const { groupId, messageId, timestamp } = data;

    let members;

    return admin.database().ref(`groupMessage/${groupId}/${messageId}`).remove()
      .then(_ => {
        return admin.database().ref(`groupDetail/${groupId}`).once('value')
      })
      .then((snapshot) => {
        const { lastMessage } = snapshot.val();
        members = snapshot.val().members;

        if (lastMessage.messageId === messageId) {
          return admin.database().ref(`groupMessage/${groupId}`).once('value');
        }

        return true;
      })
      .then((snapshot) => {
        if (snapshot === true) {
          return true;
        }

        let lastMessage = null;
        if (snapshot.val()) {
          snapshot.forEach((message) => {
            const { updatedAt } = message.val();
            if (!lastMessage || lastMessage.updatedAt < updatedAt) {
              lastMessage = message.val();
              lastMessage.messageId = message.key;
            }
          });
        }

        return admin.database().ref(`groupDetail/${groupId}`).update({ lastMessage, updatedAt: timestamp });
      })
      .then((snapshot) => {
        if (snapshot === true) {
          return true;
        }

        let promises = Object.keys(members).map((memberId) => {
          const {isStudent} = members[memberId];

          return calculateUnreadCounts(groupId, memberId, isStudent, timestamp);
        });

        return Promise.all(promises)
      })
      .then(_ => {
        return { result: 'Success' }
      });
});

const calculateUnreadCounts = (groupId, receiverId, isStudent, timestamp) => {
  const userType = isStudent ? 'students/' : 'faculty/';
  let lastSeen;

  return admin.database().ref(`${userType}/${receiverId}/groups/${groupId}`).once('value')
    .then((userGroup) => {
      lastSeen = userGroup.val().lastSeen;
      return admin.database().ref(`groupMessage/${groupId}`).once('value')
    })
    .then((snapshot) => {
      let unreadCount = 0;

      snapshot.forEach((conversation) => {
        const { updatedAt, sender } = conversation.val();
        if(updatedAt > lastSeen) {
          unreadCount++;
        }
        if (receiverId === sender) {
          unreadCount = 0;
        }
      });
      const userType = isStudent ? 'students' : 'faculty';
      return admin.database().ref(`${userType}/${receiverId}/groups/${groupId}`).update({ unreads: unreadCount, random: timestamp })
        .then((snapshot) => {
          return unreadCount;
        })
    });
};
