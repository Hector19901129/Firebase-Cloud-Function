const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const { groupId } = data;

    let promises = [];

    return admin.database().ref(`groupDetail/${groupId}`).once('value')
      .then((snapshot) => {
          const group = snapshot.val();

          Object.keys(group.members).map((memberId) => {
              const { isStudent } = group.members[memberId];
              let type = isStudent ? `students` : `faculty`;

              promises.push(admin.database().ref(`${type}/${memberId}/groups/${groupId}`).remove());
          });

          promises.push(admin.database().ref(`groupDetail/${groupId}`).remove());
          promises.push(admin.database().ref(`groupMessage/${groupId}`).remove());

          return Promise.all(promises)
      })
      .then((snapshot) => {
          return {
              result: 'Success'
          }
      })
});