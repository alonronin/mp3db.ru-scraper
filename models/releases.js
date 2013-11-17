var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types;

var schema = new Schema({
    cid: Number,
    title: String,
    url: { type: String, unique: true},
    files: [String],
    date: Date
});

var model = module.exports = mongoose.model('releases', schema);