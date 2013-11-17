var $ = require('jquery'),
    async = require('async'),
    mongoose = require('mongoose'),
    models = require('./models'),
    ProgressBar = require('progress'),
    url = require('url'),
    program = require('commander');

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

$.extend(Scraper.prototype, {
    scrape: function(category, pages, start){
        var self = this;
        self.cid = category;

        start || (start = 1);
        pages || (pages = 1);

        var url = self.parseUrl('index.php?cid=' + self.cid),
            deferred = $.Deferred();

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
                self.getTitles(self.addQuery(url, self.page_query, page)).done(function(){
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

        return deferred;
    },
    check: function(){
        var self = this;
        var deferred = $.Deferred();

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

        return deferred;
    },
    getTitles: function(url){
        var self = this;
        var deferred = $.Deferred();

        $.get(url).done(function(html){
            var titles = $(html).find('a.ptitle');

            if(titles){
                $.each(titles, function(){
                    self.links.push($(this).attr('href'));
                });

                deferred.resolve();
            }else{
                deferred.reject()
            }

        });

        return deferred;
    },
    getFiles: function(){
        var self = this,
            deferred = $.Deferred();

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
                $.get(self.parseUrl(link)).done(function(html){
                    var $html = $(html),
                        files = [],
                        title = $html.find('div.ptitle').text(),
                        date = self.getDate(html),
                        downloads = $html.find('a[href^="http://novafile"]');

                    $.each(downloads, function(){
                        var file = $.trim($(this).text());
                        if(self.isFile(file)) files.push(file);
                    });

                    self.files.push({cid: self.cid, title: title, url: link, files: files, date: date});

                    bar.tick();

                    done();
                })
            },
            function(error){
                console.log();
                deferred.resolve();
            }
        );

        return deferred;
    },
    updateDb: function(){
        var self = this,
            deferred = $.Deferred();

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

        return deferred;
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
    .version('0.1.6')
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
