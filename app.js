
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path'),
    mongoose = require('mongoose'),
    models = require('./models');

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

app.get('/', function(req, res){
    models.releases.find().lean().exec(function(err, results){
        res.render('releases', { releases: results });
    })
});

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/mp3db');

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
