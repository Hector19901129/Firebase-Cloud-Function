'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
//admin.initializeApp();


exports = module.exports  = functions.https.onRequest((req, res) => {
    const timeNow = Date.now()/1000;  // time in seconds
    console.log('time now in seconds = ',timeNow);
    const messagesRef = admin.database().ref('/announcements').orderByChild('pinnedToDate').startAt(1).endAt(timeNow);
    messagesRef.once('value', (snapshot) => {
                     console.log('pinned announcements expired = ', snapshot.numChildren());
        snapshot.forEach((child) => {
                 console.log('pinned announcement with Message : ', child.val()['message']);
            if (Number(child.val()['pinnedToDate'] )  <= timeNow) {
                console.log('Delete pinned announcement with Message : ', child.val()['message'], " with id : " ,child.key );
                child.ref.set(null);
            }
        });
    });
    return res.status(200).end();
});