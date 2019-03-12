const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const senderId = context.auth.uid;
    const { groupId } = data;

    let updatedGroup = {
        name: data.name,
        members: data.members,
        updatedAt: data.timestamp,
    };

    let group;

    return admin.database().ref(`groupDetail/${groupId}`).once('value')
      .then((snapshot) => {
          group = snapshot.val();

          let promises = Object.keys(group.members).map((memberId) => {
              if (!updatedGroup.members[memberId]) {
                  const { isStudent } = group.members[memberId];
                  let path;
                  if(isStudent) {
                    path = 'students/' + memberId + '/groups'
                  } else {
                    path = 'faculty/' + memberId + '/groups'
                  }
                  return admin.database().ref(`${path}/${groupId}`).remove()
              }

              return true
          });

          promises.concat(Object.keys(updatedGroup.members).map((memberId) => {
              const { isStudent } = updatedGroup.members[memberId];
              let path;
              if(isStudent) {
                  path = 'students/' + memberId + '/groups'
              } else {
                  path = 'faculty/' + memberId + '/groups'
              }

              if (!group.members[memberId]) {
                  return admin.database().ref(`${path}/${groupId}`).update({ id: groupId, lastSeen: data.timestamp })
              }
              return admin.database().ref(`${path}/${groupId}`).update({ random: data.timestamp })
          }));

          return Promise.all(promises)
      }).then(() => {
          return admin.database().ref(`groupDetail/${groupId}`).update(updatedGroup)
      }).then(() => {
          return {
              result: Object.assign({}, group, updatedGroup, { groupId })
          }
      })
});