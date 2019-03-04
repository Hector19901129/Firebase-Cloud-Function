'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {

	const uid = context.auth.uid;

	return getLastCleanTimestampPromise(uid).then((last_clean) => {

		console.log('last cleaned at', last_clean, Date.now());

		// if (Date.now() - last_clean > 24*60*60*1000) {
			return cleanLeavesTaskPromise('newleaves/' + uid, uid).then(() => {
				return cleanLeavesTaskPromise('leaves/', uid);
			});
		// } else {
		// 	console.log('Skipped cleaning');
		// 	return 'Skipped';
		// }
	});
});

var cleanLeavesTaskPromise = (leaveNodePath, uid) => {
	return new Promise((resolve, reject) => {
		return admin.database().ref(leaveNodePath).once('value', (snapshot) => {

			snapshot.forEach((leaveNode) => {

				const leave = leaveNode.val()
				const facultyApprovalStatus = (leave.status&0xF00)>>8;
				const momApprovalStatus = (leave.status&0x0F0)>>4;
				const dadApprovalStatus = (leave.status&0x00F);

				const isDeclined = (facultyApprovalStatus === 1) || 
									(momApprovalStatus === 1 || dadApprovalStatus === 1);
				const isApproved = (facultyApprovalStatus === 2 && (momApprovalStatus === 2 || dadApprovalStatus === 2));
				const isCompleted = isDeclined || isApproved;
				const isPast = leave.start_date < (Date.now()/1000.0);

				console.log("Key, Status, isPast, isCompleted", leaveNode.key, leave.status, isPast, isCompleted);

				if (!isCompleted && isPast) {
					// remove leave
					console.log('removing node', leaveNode.key);
					//admin.database().ref(leaveNodePath + '/' + leaveNode.key).set(null);
				}
			});

			//admin.database().ref('students/' + uid + '/last_leaves_clean').set(Date.now());

			resolve();
		});
	});
}

var getLastCleanTimestampPromise = (uid) => {

	return new Promise((resolve, reject) => {

		admin.database().ref('students/' + uid).once('value', (snapshot) => {

			if (snapshot.exists()) {
				if(snapshot.hasChild('last_leaves_clean')) {
					resolve(snapshot.val().last_leaves_clean);
				} else {
					resolve(0);
				}
			} else {
				resolve(Date.now());	// student not found, so force skip
			}
		});
	});
};
