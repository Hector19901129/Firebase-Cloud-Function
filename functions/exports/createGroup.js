const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {
    const userType = data.userType;
    const senderId = context.auth.uid;

    var newGroup = {
        name: data.name,
        adminId: senderId,
        members: data.members,
        timestamp: data.timestamp
    };

    return admin.database().ref('groupDetail').push(newGroup).then((snapshot) => {
        let path;
        if(userType === 'faculty') {
            path = 'faculty/' + senderId + '/groups'
        }else {
            path = 'students/' + senderId + '/groups'
        }

        newGroup.groupId = snapshot.key;
        return admin.database().ref(path).push(snapshot.key)

        // var groups = []
        // groups = admin.database().ref(path)
        // if(groups && groups.length) {
        //     groups.push(snapshot.key)
        //     return admin.database().ref(path).set(groups)
        // }else{
        //     return admin.database().ref(path).set(snapshot.key)
        // }

    }).then((snapshot) => {
        return {
            result: newGroup
        }
    })
});