# spark-bot-redmine-notifer

This script send the update information of redmine to Cisco Spark every 5 minutes.

![chat](https://github.com/kongou-ae/spark-bot-redmine-notifer/raw/master/sample.png)

## Usage
1. make `config.json`
1. `node index.js` or `node index.js -c config.json`

## Notice
The API of redmine can't get a ticket which is closed. So this script use atom instead of API.
