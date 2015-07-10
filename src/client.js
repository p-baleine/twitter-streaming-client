import debug from "debug";
import Emitter from "component-emitter";
import {extend} from "./util";
import request from "request";
import TwitterRateLimitError from "./twitter-rate-limit-error";
import url from "url";

var log = debug("twitter-streaming-client");

const STATE_READING_LENGTH = 0;
const STATE_READING_DATA = 1;
const STATE_ABORT = 2;

/**
 * Twitter Streaming API client.
 */

export default class TwitterStreamingClient extends Emitter {

  /**
   * Constructor.
   *
   * @param {String} endpoint
   * @param {Object} oauth
   * @api public
   */

  constructor(endpoint, oauth) {
    super();

    this.oauth = oauth;
    this.endpoint = TwitterStreamingClient.formatEndpoint(endpoint);
    this.params = {};
    this.state = STATE_READING_LENGTH;
    this.length = 0;
    this.buffer = "";
    this.req = null;
  }

  /**
   * Open the connect to `this.endpoint`.
   *
   * @return this
   * @api public
   */

  open(params) {
    this.params = params || this.params;

    var obj = extend({ url: this.endpoint, oauth: this.oauth }, this.params);

    this.req = request.post(obj)
      .on("data", (data) => this.processData(data))
      .on("response", (response) => this.parseResponse(response))
      .on("error", (err) => this.emit("error", err))
      .on("end", () => this.emit("end"));

    return this;
  }

  /**
   * Close the connection.
   *
   * @return this
   * @api public
   */

   close() {
     this.req.abort();
   }

  /**
   * Process request's `data` event.
   *
   * @api private
   */

  processData(data) {
    this.emit("data", data);

    data = data.toString("utf8");

    var idx = 0;

    while (idx < data.length) {
      switch (this.state) {
      case STATE_READING_LENGTH:
        idx = this.readLine(idx, data);

        if (idx === -1) {
          return this;
        }

        if (!this.isBlankLine()) {
          this.length = parseInt(this.buffer, 10);

          if (isNaN(this.length)) {
            this.lastError = new Error(`length is not a number ${data}`);
            this.state = STATE_ABORT;
          } else {
            this.clearBuffer();
            this.state = STATE_READING_DATA;
          }
        } else {
          log("blank line...");
        }

        break;

      case STATE_READING_DATA:
        idx = this.readLength(idx, data);

        if (this.isDataEnd()) {
          let message = null;

          try {
            message = JSON.parse(this.buffer);
            this.emitMessage(message);
            this.state = STATE_READING_LENGTH;
          } catch(error) {
            this.lastError = error;
            this.state = STATE_ABORT;
          } finally {
            this.length = 0;
            this.clearBuffer();
          }
        }

        break;

      case STATE_ABORT:
        this.emit("error", this.lastError);
        return this;

      default:
        throw new Error("unknown state");
      }
    }

    if (this.state === STATE_ABORT) {
      this.emit("error", this.lastError);
    }

    return this;
  }

  /**
   * Parse `response`.
   *
   * @api private
   */

   parseResponse(response) {
     if (response.statusCode === 200) {
       this.emit("response", response);
     } else if (response.statusCode === 420) {
       this.emit("error", new TwitterRateLimitError(response.statusText));
     } else if (response.statusCode === 401) {
       this.emit("error", new Error("Unauthorized"));
     } else {
       this.emit("error", new Error(response.statusText));
     }

     return this;
   }

  /**
   * Read one line into `this.buffer` from `idx` of `data`.
   *
   * @api private
   */

  readLine(idx, data) {
    var end = data.indexOf("\r\n", idx);
    this.buffer = data.slice(idx, end + 1);
    return end === -1 ? end : end + 2;
  }

  /**
   * Read data into `this.buffer` from `idx` of `data`.
   *
   * @api private
   */

  readLength(idx, data) {
    var end = this.length - this.buffer.length;
    this.buffer += data.slice(idx, idx + end);
    return idx + end;
  }

  /**
   * Check if `this.buffer` contains a blank line.
   *
   * @api private
   */

  isBlankLine() {
    return this.buffer.replace(/[\n\r]/g, "").length === 0;
  }

  /**
   * Check if `this.buffer` contains the whole data.
   *
   * @api private
   */

  isDataEnd() {
    return this.buffer.length === this.length;
  }

  /**
   * Clear `this.buffer`.
   *
   * @api private
   */

  clearBuffer() {
    this.buffer = "";
  }

  /**
   * Emit `message`.
   *
   * @api private
   */

  emitMessage(message) {
    if (message.text) {
      this.emit("status", message);
    } else if (message.delete) {
      this.emit("delete", message);
    } else if (message.friends) {
      this.emit("friends", message);
    } else if (message.event) {
      if (message.event === "favorite") {
        this.emit("favorite", message);
      }
    }

    return this;
  }

  // Override
  emit(event, ...args) {
    log(`${event} emitted`)
    super.emit.apply(this, [event].concat(args));
    return this;
  }

  /**
   * Format `endpoint`.
   *
   * @api public
   */

  static formatEndpoint(endpoint) {
    var parsed = url.parse(endpoint, true);

    // ensure `delimited=length` option
    parsed.query.delimited = "length";

    return url.format(parsed);
  }
}
