'use strict'

var Spark = require('csco-spark');
var FeedParser = require('feedparser');
var request = require('request');
var moment = require("moment");
var schedule = require('node-schedule');
var program = require('commander');

program
  .version('0.0.1')
  .option('-c, --config <config file>', 'set config file (default config.json)')
  .parse(process.argv);

// -c オプションがなければ、デフォルト値のconfig.jsonを設定
if (program.config == null){
  program.config = 'config.json'
}

// 与えられたコンフィグファイルの拡張子が.jsonでなければエラーにする
if (!program.config.match(/\.json$/)){
  throw new Error('config file must be json format.')
}

var config = require('./'+ program.config )
var spark = Spark({
  uri: 'https://api.ciscospark.com/v1',
  token: config.spark.token
});

console.log('Config file is '+ program.config)
console.log('Start spark-bot-redmine-notifer')

var j = schedule.scheduleJob('*/5 * * * 0-6', function(){

  var feedparser = new FeedParser({});
  var req = request(config.redmine.atom);

  req.on('error', function (error) {
    console.log(error)
  });
  req.on('response', function (res) {
    var stream = this;
    if (res.statusCode != 200) {
      return this.emit('error', new Error('Bad status code'));
    }
    stream.pipe(feedparser);
  });

  feedparser.on('readable', function() {
    var stream = this
      , meta = this.meta
      , item;
    while (item = stream.read()) {
      var titleAry = item.title.match(/.* (#\d*)(.*): (.*)/)
      var metaTitleAry = item.meta.title.match(/(.*):/)
      var detail = ""
      var diff = ""

      // ステータス変更があった場合、detailに追記
      if (titleAry[2].match(/\((.*)\)/)){
        detail = "* Detail: Status changed to " + titleAry[2].match(/\((.*)\)/)[1] + "."
      }

      // コメントに変更があtt場合は、detailに追記
      if (item.description){
        // ステータスが変更になっていない場合
        if (detail == ""){
          detail = "* Detail: a comment is as below." + "\n\n"+ "---\n" + item.description + "\n---"
        } else {
          detail = detail + " Comments are as below." + "\n\n"+ "---\n" + item.description + "\n---"
        }
      }

      var botMessage = "Redmine has been updated.\n* Project："+metaTitleAry[1]+"\n* Ticket："+titleAry[3]+"\n* Updater："+item.author+"\n* Link："+ item.link + "\n" + detail

      var updateTimeBeforeNow = moment(item.date).endOf('minute').fromNow()
      if (updateTimeBeforeNow.match(/(.*) minutes* ago/)){
        diff = updateTimeBeforeNow.match(/(.*) minutes* ago/)[1]
        if (diff == "a"){
          diff = 1
        }
      }

      // diff == "" は1時間以上前の更新だからスキップ
      if ( diff != ""){
        if ( diff <= 5 ) {
          spark.sendMessage({
            roomId:config.spark.roomId,
            markdown: botMessage
          })
        }
      }
    }
  });
})
