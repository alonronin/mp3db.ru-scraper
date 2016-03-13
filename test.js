var request = require('superagent');

request
    .get('http://mp3db.ru')
    .set('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36')
    .end(function(err, res){
        console.log(err, res);
    });