var mongojs = require('mongojs');

var connection_string = ''; // TODO add database connection data here

var db = mongojs(connection_string, ['participants']);

module.exports = db;
