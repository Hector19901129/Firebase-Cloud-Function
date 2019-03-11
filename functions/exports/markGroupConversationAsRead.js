const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const senderId = context.auth.uid;
    const { isStudent, groupId } = data;

    let userType = isStudent ? `students` : `faculty`;

    return admin.database().ref(`${userType}/${senderId}/groups/${groupId}`).update({ lastSeen: new Date(), unreads: 0 })
      .then((snapshot) => {
          return { result: 'Success' };
      })
});