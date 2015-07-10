# twitter-streaming-client

Twitter Streaming API Client.

## Installation

```bash
$ npm install twitter-streaming-client
```

## Example

The following code connects to [User Stream](https://dev.twitter.com/streaming/userstreams) and displays statuses.

```js
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
```

Another example connected to [Public streams](https://dev.twitter.com/streaming/public) is in the `examples` directory.

## Events

Currently only following events are supported. Other events would be supported soon.

* `status`(status): when a status is received
* `delete`(status): when a status is deleted
* `favorite`(event): when a authorized user's status is favorited
* `friends`(friends): when authorized user's friends data are recived
* `error`(err): when an error occurred

## API

### userStream(oauth)

Create a `TwitterStreamClient` that connects to [User Stream](https://dev.twitter.com/streaming/userstreams).

### publicStream(oauth)

Create a `TwitterStreamClient` that connects to [Public streams](https://dev.twitter.com/streaming/public).

### TwitterStreamClient#open(requestOption)

Open a connection to Streaming API.
Tracking keywords can be specified as `{ form: { track: "<comma separated keywords>" } }` form in `requestOptions`.

### TwitterStreamClient#close()

Close a connection to Streaming API.

## Development

twitter-streaming-client takes advantage of [Babel](https://babeljs.io/). Source code are in `src` directory and generated code are in `lib` directory.

### Build

```bash
$ npm run build
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```

## License

twitter-streaming-client is released under the MIT License.
