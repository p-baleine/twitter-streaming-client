var colors = require("colors");
var format = require("util").format;
var publicStream = require("..").publicStream;

var oauth = {
  consumer_key: '<CONSUMER KEY>',
  consumer_secret: '<CONSUMER SECRET>',
  token: '<ACCESS TOKEN>',
  token_secret: '<ACCESS TOKEN SECRET>'
};

// Connecting to a public stream more than once with the same account
// credentials will cause the oldest connection to be disconnected.
// So we have to track multiple words by one connection and sort out
// received statuses

var keywords = {
  "rust": { color: "magenta", re: /rust/ },
  "golang": { color: "green", re: /golang/ },
  "julia": { color: "cyan", re: /julia/ }
}

function printStatus(key, status) {
  var entry = keywords[key];

  console.log("[" + key[entry.color] + "]");
  console.log(format("%s %s\n%s\n\n", status.user.screen_name, status.created_at, status.text));
}

publicStream(oauth).open({ form: { track: Object.keys(keywords).join(",") } })
  .on("error", function(err) { console.log(err); })
  .on("status", function(status) {
    for (var key in keywords) {
      if (status.text.match(keywords[key].re)) {
        printStatus(key, status);
      }
    }
  });
