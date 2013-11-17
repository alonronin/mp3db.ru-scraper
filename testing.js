var mongoose = require('mongoose'),
    models = require('./models');

mongoose.connect('mongodb://localhost/mp3db');

//var arr = [
//    {name: 'Electronic', cid: 9},
//    {name: 'Rap', cid: 8},
//    {name: 'Rock', cid: 10},
//    {name: 'Metal', cid: 11},
//    {name: 'Alternative', cid: 12},
//    {name: 'Pop', cid: 14},
//    {name: 'Psychedelic', cid: 15},
//    {name: 'Punk', cid: 16},
//    {name: 'Soundtrack (OST)', cid: 17},
//    {name: 'Top 40', cid: 18},
//    {name: 'Music Clips', cid: 19},
//    {name: 'Other', cid: 13}
//];
//
//models.categories.create(arr, function(err){
//    console.log('done')
//});

models.categories.findOne().where('cid', 18).exec(function(err, docs){
    docs.remove(function(){
        console.log('done')
    })
});











