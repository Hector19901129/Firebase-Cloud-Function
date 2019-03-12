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

        let lastMessage;
        snapshot.forEach((message) => {
          const { updatedAt } = message.val();
          if(!lastMessage || lastMessage.updatedAt < updatedAt) {
            lastMessage = message.val();
          }
        });

        return admin.database().ref(`groupDetail/${groupId}`).update({ lastMessage, updatedAt: timestamp });
      })
      .then((snapshot) => {
        if (snapshot === true) {
          return true;
        }

        let promises = Object.keys(members).map((memberId) => {
          const { isStudent } = members[memberId];
          const userType = isStudent ? 'students' : 'faculty';

          return admin.database().ref(`${userType}/${memberId}/groups/${groupId}`).update({ updatedAt: timestamp });
        });

        return Promise.all(promises)
      })
      .then(_ => {
        return { result: 'Success' }
      });
});
