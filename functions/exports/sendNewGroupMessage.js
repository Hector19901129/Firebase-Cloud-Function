const functions = require('firebase-functions')
const admin = require('firebase-admin')

exports = module.exports = functions.https.onCall((data, context) => {

    const senderId = context.auth.uid
    const groupId = data.groupId


    var newGroupMessage = {
        senderId: senderId,
        message: data.message,
        timestamp: data.timestamp,
        isRead: false
    }

    let path = 'groupMessage/' +groupId 

    return admin.database().ref(path).push(newGroupMessage).then((snapshot) => {
        return {
            result: 'success'
        }
    })
})