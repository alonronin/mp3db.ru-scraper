var cheerio = require('cheerio');
var request = require('superagent');
var _ = require('lodash');
var q = require('q');
var async = require('async');
var mongoose = require('mongoose');
var models = require('./models');
var ProgressBar = require('progress');
var url = require('url');
var program = require('commander');

// todo replace sugar with moment and lodash
require('sugar');

mongoose.connect('mongodb://localhost/mp3db');

var Scraper = function(){
    this.url = '';
    this.cid = null;
    this.page_query = 'page';
    this.links = [];
    this.files = [];
    this.limit = 5;
    this.date = new Date;
};

_.extend(Scraper.prototype, {
    scrape: function(category, pages, start){
        var self = this;

        category || (category = 9);
        start || (start = 1);
        pages || (pages = 1);

        self.cid = category;


        var url = self.parseUrl('index.php?cid=' + self.cid),
            deferred = q.defer();

        console.log('starting scraper', self.date);

        var arr = [];
        for(var i = start; i <= (pages + start - 1); i++ ){
            arr.push(i);
        }

        console.log();

        var bar = new ProgressBar('fetching new links [:bar] :percent :etas', {
            complete: '='
            , incomplete: ' '
            , width: 50
            , total: arr.length
        });

        async.eachLimit(arr,
            self.limit,
            function(page, done){
                self.getTitles(self.addQuery(url, self.page_query, page)).then(function(){
                    bar.tick();
                    done();
                });
            },
            function(error){
                console.log();
                console.log('links found:', self.links.length);
                deferred.resolve();
            }
        );

        return deferred.promise;
    },
    check: function(){
        var self = this;
        var deferred = q.defer();

        models.releases.find().in('url', self.links).exec(function(err, results){
            if(results) {
                var arr = results.map('url');
                arr = self.links.subtract(arr);

                var removed = self.links.length - arr.length;

                self.links = arr;

                console.log('links foudend in db', removed);
            }
            deferred.resolve();
        });

        return deferred.promise;
    },
    getTitles: function(url){
        var self = this;
        var deferred = q.defer();

        request
            .get(url)
            .set('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36')
            .end(function(err, res){
                if(err) deferred.reject(err);

                var $ = cheerio.load(res.text);

                var titles = $('a.ptitle');

                if(titles){
                    titles.each(function(){
                        self.links.push($(this).attr('href'));
                    });

                    deferred.resolve();
                }else{
                    deferred.reject()
                }
            });

        return deferred.promise;
    },
    getFiles: function(){
        var self = this,
            deferred = q.defer();

        console.log();

        var bar = new ProgressBar('fetching files [:bar] :percent :etas', {
            complete: '='
            , incomplete: ' '
            , width: 50
            , total: self.links.length
        });

        async.eachLimit(self.links,
            self.limit,
            function(link, done){

                request
                    .get(self.parseUrl(link))
                    .set('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36')
                    .end(function(err, res){
                        if(err) deferred.reject(err);

                        var $ = cheerio.load(res.text);

                        var files = [];
                        var title = $('div.ptitle').text();
                        var date = self.getDate($.html());
                        var downloads = $('a[href^="http://novafile"]');

                        downloads.each(function(){
                            var file = _.trim($(this).text());
                            if(self.isFile(file)) files.push(file);
                        });

                        self.files.push({cid: self.cid, title: title, url: link, files: files, date: date});

                        bar.tick();

                        done();
                    });
            },
            function(error){
                console.log();
                deferred.resolve();
            }
        );

        return deferred.promise;
    },
    updateDb: function(){
        var self = this,
            deferred = q.defer();

        console.log();

        var files = self.files.inGroups(500);

        var bar = new ProgressBar('update db [:bar] :percent :etas', {
            complete: '='
            , incomplete: ' '
            , width: 50
            , total: files.length
        });

        async.each(files,
            function(docs, done){
                models.releases.create(docs, function(err){
                    bar.tick();
                    done();
                })
            },
            function(err){
                console.log();
                deferred.resolve()
            }
        );

        return deferred.promise;
    },
    end: function(){
        var self = this;

        console.log('finished after ', new Date - self.date, 'ms');
        process.exit();
    },
    isFile: function(str){
        return /^http:\/\//i.test(str)
    },
    parseUrl: function(str){
        var self = this,
            o = url.parse(str);

        if(!/^\//.test(o.path)) o.path = '/' + o.path;

        return self.url + o.path;
    },
    addQuery: function(uri, query, value){
        var self = this,
            o = url.parse(uri);

        query += '=';

        return uri + (o.query ? '&' : '?') + query + value;
    },
    getDate: function(html){
        var date = new Date();

        html.replace(/<b>date.*<\/b> (.*)/i, function(match, str){
            date = Date.create(str, 'he');
        });

        return date;
    }
});

var scraper = new Scraper();
scraper.url = 'http://mp3db.ru';

program
    .version(require('./package.json').version)
    .option('-c, --category [number]', 'Pass the category number', Number)
    .option('-p, --pages [number]', 'Number of pages to scan', Number)
    .option('-s, --start [number]', 'Page number to start', Number)
    .parse(process.argv);

scraper
    .scrape(program.category, program.pages, program.start)
    .then(function(){
        return scraper.check();
    })
    .then(function(){
        return scraper.getFiles();
    })
    .then(function(){
        return scraper.updateDb();
    })
    .then(function(){
        scraper.end();
    });
