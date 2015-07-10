var format = require("util").format;
var userStream = require("..").userStream;

var oauth = {
  consumer_key: '<CONSUMER KEY>',
  consumer_secret: '<CONSUMER SECRET>',
  token: '<ACCESS TOKEN>',
  token_secret: '<ACCESS TOKEN SECRET>'
};

function printStatus(status) {
  console.log(format("%s %s\n%s\n\n", status.user.screen_name,
                     status.created_at, status.text));
}

userStream(oauth).open()
  .on("error", function(err) { console.log(err); })
  .on("status", printStatus);
