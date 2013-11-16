var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types;

var schema = new Schema({
    name: String
});

var model = module.exports = mongoose.model('categories', schema);