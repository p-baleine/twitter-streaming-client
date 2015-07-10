import ReconnectingProxy from "./reconnecting-proxy";
import TwitterStreamClient from "./client";

const USER_STREAM_ENDPOINT = "https://userstream.twitter.com/1.1/user.json";

export function userStream(oauth) {
  var client = new TwitterStreamClient(USER_STREAM_ENDPOINT, oauth, {});
  return new ReconnectingProxy(client);
}

export function publicStream(oauth) {
  var client = new TwitterStreamClient(USER_STREAM_ENDPOINT, oauth, {});
  return new ReconnectingProxy(client);
}
