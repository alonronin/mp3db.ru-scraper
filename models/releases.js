var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types;

var schema = new Schema({
    title: String,
    url: { type: String, unique: true},
    files: [String]
});

var model = module.exports = mongoose.model('releases', schema);