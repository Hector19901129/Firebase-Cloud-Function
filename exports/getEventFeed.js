'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {

	const uid = context.auth.uid;
	const visibility = data.visibility;

	console.log('going to find events for uid = ', uid);

	return findEventsFor(uid, visibility).then((events) => {
		return arrangeEvents(events);
	}).then( (orderedEvents) => {
		return orderedEvents;
	});
});

var findEventsFor = (uid, visibility) => {
	return new Promise((resolve, reject) => {
		admin.database().ref('events/').once('value', (snapshot) => {

			var results = [];

			snapshot.forEach((event) => {

				var eventObject = event.val();
				eventObject['id'] = event.key;

				console.log('findEventsFor', eventObject.visibility, eventObject.name, eventObject.checkins);

				if (visibility === eventObject.visibility) {
					if (eventObject.visibility === true || 
						eventObject.created_by.id === uid) {
						console.log('adding because of public or owner');
						results.push(eventObject);
					} else {
						var checkins = eventObject.checkins;

						checkins.forEach((participant) => {
							if (participant.user_id === uid) {
								console.log('adding because ', uid, participant);
								results.push(eventObject);
							}
						});
					}
				}
			});

			console.log('found events', results);
			resolve(results);
		});
	});
}

var arrangeEvents = (events) => {
	return new Promise((resolve, reject) => {
		resolve(events.sort((first, second) => {
			return first.start_time < second.start_time;
		}));
	});
}

