'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

var allStudents, allFaculties;

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
	console.log('getParticipants API called', data);

	const searchTerms = data.searchTerms;
	const start = data.start;
	const count = data.count;

	return filterStudents(searchTerms).then((students) => {
		return arrangeStudentsByLastName(students);
	}).then((orderedStudents) => {
		allStudents = orderedStudents;
		return filterFaculties(searchTerms);
	}).then((faculities) => {
		return arrangeFacultiesByLastName(faculities);
	}).then((orderedFaculties) => {
		allFaculties = orderedFaculties;
		// var res = orderedStudents.slice(start, start + count);
		var returnValue = {'finished': true,//(orderedStudents.length <= start + count),
							'students': allStudents,
							'faculties': allFaculties};

		console.log('returning', returnValue);
		return returnValue;
	});
});

function isMatching(student, searchTerms) {

	// if(searchTerms.gender !== null && student.gender === searchTerms.gender) 
	// 	return true;

	// if(searchTerms.dorm !== null && student.dorm === searchTerms.dorm) 
	// 	return true;

	// if(searchTerms.current_location !== null && student.current_location === searchTerms.current_location) 
	// 	return true;

	// if(searchTerms.grade !== null && student.grade === searchTerms.grade) 
	// 	return true;

	// return false;
}

var filterFaculties = (searchTerms) => {
	return new Promise((resolve, reject) => {
		admin.database().ref('faculty/').once('value', (snapshot) => {

			var results = [];

			snapshot.forEach((faculty) => {

				var facultyId = faculty.key;
				var facultyObject = faculty.val();

				// if (isMatching(facultyObject, searchTerms)) {
					facultyObject['id'] = facultyId;
					results.push(facultyObject);
				// }
			});

			console.log('filtered faculties', results);
			resolve(results);
		});
	});
}

var filterStudents = (searchTerms) => {
	return new Promise((resolve, reject) => {
		admin.database().ref('students/').once('value', (snapshot) => {

			var results = [];

			snapshot.forEach((student) => {

				var studentId = student.key;
				var studentObject = student.val();

				// if (isMatching(studentObject, searchTerms)) {
					studentObject['student_id'] = studentId;
					results.push(studentObject);
				// }
			});

			console.log('filtered students', results);
			resolve(results);
		});
	});
}

var arrangeFacultiesByLastName = (faculities) => {
	return new Promise((resolve, reject) => {
		resolve(faculities.sort((first, second) => {
			return first.last_name > second.last_name;
		}));
	});
}

var arrangeStudentsByLastName = (students) => {
	return new Promise((resolve, reject) => {
		resolve(students.sort((first, second) => {
			return first.last_name > second.last_name;
		}));
	});
}

