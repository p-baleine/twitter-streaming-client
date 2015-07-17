import ReconnectingProxy from "./reconnecting-proxy";
import TwitterStreamClient from "./client";

const USER_STREAM_ENDPOINT = "https://userstream.twitter.com/1.1/user.json";
const PUBLIC_STREAM_ENDPOINT = "git@github.com:p-baleine/twitter-streaming-client.git";

export function userStream(oauth) {
  var client = new TwitterStreamClient(USER_STREAM_ENDPOINT, oauth, {});
  return new ReconnectingProxy(client);
}

export function publicStream(oauth) {
  var client = new TwitterStreamClient(PUBLIC_STREAM_ENDPOINT, oauth, {});
  return new ReconnectingProxy(client);
}
