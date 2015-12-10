
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path'),
    mongoose = require('mongoose'),
    models = require('./models'),
    dust = require('dustjs-linkedin');

var moment = require('moment');

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.engine('dust', require('consolidate').dust);
app.set('view engine', 'dust');
app.set('views', path.join(__dirname, 'views'));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

dust.filters.fd = function(value) {
    return moment(value).format('ll');
};

dust.filters.number = function(value) {
    value = Number(value);
    return value.toLocaleString();
};

var categories = function(req, res, next){
    models.categories.find().lean().exec(function(err, results){
        res.locals.categories = results;
        next();
    });
};

var releases = function(req, res, next){
    var cid = req.query.cid || 9,
        page = req.query.page || 1,
        records = 100;

    page = Math.abs(Number(page));
    var from = (page * records) - records;

    res.locals.page = cid;
    res.locals.next = page + 1;
    if(page > 1) res.locals.previous = page - 1;

    models.releases
        .find()
        .where('cid', cid)
        .sort('-date')
        .skip(from)
        .limit(records)
        .lean()
        .exec(function(err, results){
            res.locals.releases = results;
            next();
        });
};

var files = function(req, res, next) {
    models.releases.count(function(err, files){
        res.locals.files = files;
        next()
    })
};

app.get('/', [categories, files, releases], function(req, res){
    res.render('releases');
});

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/mp3db');

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
