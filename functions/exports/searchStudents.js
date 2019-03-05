'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports = module.exports = functions.https.onCall((data, context) => {

	/*
		data = {
			searchTerms : {
				gender,
				dorm,
				current_location,
				grade,
			},

			start: Int,
			count: Int,
		}
	*/
	console.log('searchStudent API called', data);

	const searchTerms = data.searchTerms;
	const start = data.start;
	const count = data.count;

	return filterStudents(searchTerms).then((students) => {
		return arrangeStudentsByLastName(students);
	}).then( (orderedStudents) => {
		var res = orderedStudents.slice(start, start + count);
		var returnValue = {'finished': (orderedStudents.length <= start + count),
							'students': res};

		console.log('returning', returnValue);
		return returnValue;
	});
});



// exports = module.exports = functions.https.onRequest((req, res1) => {

// 	/*
// 		data = {
// 			searchTerms : {
// 				gender,
// 				dorm,
// 				current_location,
// 				grade,
// 			},

// 			start: Int,
// 			count: Int,
// 		}
// 	*/
// 	//console.log('searchStudent API called', data);

// 	const searchTerms = req.body.searchTerms;
// 	const start = req.body.start;
// 	const count = req.body.count;

// 	return filterStudents(searchTerms).then((students) => {
// 		return arrangeStudentsByLastName(students);
// 	}).then( (orderedStudents) => {
// 		var res = orderedStudents.slice(start, start + count);
// 		var returnValue = {'finished': (orderedStudents.length <= start + count),
// 							'students': res};

// 		console.log('returning', returnValue);
// 		res1.send(returnValue);
// 	});
// });

function isMatching(student, searchTerms) {

	if(searchTerms.gender !== null && student.gender === searchTerms.gender) 
		return true;

	if(searchTerms.dorm !== null && student.dorm === searchTerms.dorm) 
		return true;

	if(searchTerms.current_location !== null && student.current_location === searchTerms.current_location) 
		return true;

	if(searchTerms.grade !== null && student.grade === searchTerms.grade) 
		return true;

	return false;
}

var filterStudents = (searchTerms) => {
	return new Promise((resolve, reject) => {
		admin.database().ref('students/').once('value', (snapshot) => {

			var results = [];

			snapshot.forEach((student) => {

				var studentId = student.key;
				var studentObject = student.val();

				if (isMatching(studentObject, searchTerms)) {
					studentObject['student_id'] = studentId;
					results.push(studentObject);
				}
			});

			console.log('filtered students', results);
			resolve(results);
		});
	});
}

var arrangeStudentsByLastName = (students) => {
	return new Promise((resolve, reject) => {
		resolve(students.sort((first, second) => {
			return first.last_name > second.last_name;
		}));
	});
}

