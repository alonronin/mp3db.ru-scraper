var $ = require('jquery'),
    async = require('async'),
    mongoose = require('mongoose'),
    models = require('./models'),
    ProgressBar = require('progress'),
    url = require('url');

require('sugar');

mongoose.connect('mongodb://localhost/mp3db');

var Scraper = function(){
    this.url = '';
    this.page_query = 'page';
    this.links = [];
    this.files = [];
    this.limit = 5;
    this.date = new Date;
};

$.extend(Scraper.prototype, {
    start: function(path, pages){
        var self = this,
            url = self.parseUrl(path),
            deferred = $.Deferred();

        console.log('starting scraper', self.date);

        if(pages){
            var arr = [];
            for(var i = 1; i <= pages; i++ ){
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
        }else{
            self.getTitles(url).done(function(){
                console.log('links found:', self.links.length);
                deferred.resolve()
            })
        }

        return deferred;
    },
    check: function(){
        var self = this;
        var deferred = $.Deferred();

        models.releases.find().in('url', self.links).exec(function(err, results){
            if(results) {
                var arr = results.map('url');
                self.links = self.links.subtract(arr);

                console.log(self.links.length);
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
                        downloads = $html.find('a[href^="http://novafile"]');

                    $.each(downloads, function(){
                        var file = $.trim($(this).text());
                        if(self.isFile(file)) files.push(file);
                    });

                    self.files.push({title: title, url: link, files: files});

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
    }
});

var scraper = new Scraper();
scraper.url = 'http://mp3db.ru';

scraper
    .start('index.php?cid=9', 3)
    .then(function(){
        return scraper.check();
    })
/*    .then(function(){
        return scraper.getFiles();
    })
    .then(function(){
        return scraper.updateDb();
    })*/
    .then(function(){
        scraper.end();
    });
