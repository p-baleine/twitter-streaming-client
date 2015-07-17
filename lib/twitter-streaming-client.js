"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.userStream = userStream;
exports.publicStream = publicStream;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _reconnectingProxy = require("./reconnecting-proxy");

var _reconnectingProxy2 = _interopRequireDefault(_reconnectingProxy);

var _client = require("./client");

var _client2 = _interopRequireDefault(_client);

var USER_STREAM_ENDPOINT = "https://userstream.twitter.com/1.1/user.json";
var PUBLIC_STREAM_ENDPOINT = "git@github.com:p-baleine/twitter-streaming-client.git";

function userStream(oauth) {
  var client = new _client2["default"](USER_STREAM_ENDPOINT, oauth, {});
  return new _reconnectingProxy2["default"](client);
}

function publicStream(oauth) {
  var client = new _client2["default"](PUBLIC_STREAM_ENDPOINT, oauth, {});
  return new _reconnectingProxy2["default"](client);
}