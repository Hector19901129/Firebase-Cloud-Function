const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const senderId = context.auth.uid;
    const { userType } = data;

    let newGroup = {
        name: data.name,
        adminId: senderId,
        members: data.members,
        createdAt: data.timestamp,
        updatedAt: data.timestamp,
    };

    return admin.database().ref(`${userType}/${senderId}/fcmToken`).once('value')
      .then((snapshot) => {
          newGroup.members[senderId] = { isStudent: userType !== 'faculty', fcmToken: snapshot.val() };

          return admin.database().ref('groupDetail').push(newGroup)
      }).then((snapshot) => {
          newGroup.groupId = snapshot.key;

          let promises = Object.keys(newGroup.members).map((memberId) => {
              const { isStudent } = newGroup.members[memberId];
              let path;
              if(isStudent) {
                  path = 'students/' + memberId + '/groups'
              } else {
                  path = 'faculty/' + memberId + '/groups'
              }
              return admin.database().ref(`${path}/${newGroup.groupId}`).update({ id: newGroup.groupId, lastSeen: data.timestamp })
          });

          return Promise.all(promises)
      }).then((snapshot) => {
          return {
              result: newGroup
          }
      })
});