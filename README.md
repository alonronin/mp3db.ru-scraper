Mp3DB.ru Scraper
===

> scraping my mp3 favourite site http://mp3db.ru. because browsing this site is a tedious task
and I want to copy all urls to jDownloader in one action :)

Usage
---

`git clone` then `npm install --development` then run `node app` for the server and `node scraper --help`

 example to run the scraper to scrape category number 9 (Electronic), 10 pages to scan starting at page 10:

 ```
  node scraper -c 9 -p 10 -s 10
  ```

  you can see the final result at: http://mp3db.herokuapp.com/

  thanks to all of ya coders out there who made node so fun.


