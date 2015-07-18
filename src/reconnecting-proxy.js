import debug from "debug";
import Emitter from "component-emitter";
import TwitterDisconnectError from "./twitter-disconnect-error";
import TwitterRateLimitError from "./twitter-rate-limit-error";

var log = debug("twitter-streaming-client");

/**
 * Error class that represents receiving no data.
 */

class NoDataReceivedError extends Error {
  constructor() {
    var tmp = super(arguments);
    this.origin = tmp;
    this.name = "NoDataReceivedError";
  }

  get stack() { return this.origin.stack; }
}

/**
 * Proxy class that manages reconnecting.
 */

export default class ReconnectingProxy extends Emitter {

  /**
   * Constructor.
   *
   * @param {TwitterStreamingClient} client
   * @param {Object} options
   * @api public
   */

  constructor(client, options) {
    super();

    options = options || {};

    this.client = client;
    this.lastDataTimestamp = 0;
    this.lastError = null;

    this.reconnectingCheckTimer = null;
    this.reconnectingCheckTimeoutMs = options.reconnecting_check_timeout_ms || 90000;
    this.reconnectingCheckInterval = this.reconnectingCheckTimeoutMs / 6;

    this.reconnectingTimer = null;
    this.reconnectingTriedCount = 0;
    this.reconnectingInterval = null;
    this.reconnectingMaxCount = 0;

    this.backoffStrategies = options.backoff_strategies || {
      http_errors: { interval: 5000, max_count: 7 },
      rate_limit_errors: { interval: 60000, max_count: 7 }
    };
  }

  /**
   * Open client's connection.
   *
   * @param {Object} params Options carry over to `request` methods.
   * @api public
   */

  open(params) {
    this.client.open(params)
      .on("response", (...args) => {
        if (this.reconnectingTimer) {
          clearTimeout(this.reconnectingTimer);
          this.reconnectingTimer = null;
        }

        this.emit("response", args);
      })
      .on("data", () => this.setLastDataTimestamp())
      .on("status", (status) => this.emit("status", status))
      .on("delete", (status) => this.emit("delete", status))
      .on("friends", (friends) => this.emit("friends", friends))
      .on("favorite", (event) => this.emit("favorite", event))
      .on("error", (err) => this.reconnect(err));

    this.setReconnectingCheckTimer();

    return this;
  }

  /**
   * Close client's connection.
   *
   * @api public
   */

  close() {
    if (this.client) {
      this.client.close();
    }

    if (this.reconnectingCheckTimer) {
      clearInterval(this.reconnectingCheckTimer);
      this.reconnectingCheckTimer = void 0;
    }

    if (this.reconnectingTimer) {
      clearInterval(this.reconnectingTimer);
      this.reconnectingTimer = void 0;
    }

    return this;
  }

  /**
   * Try to reconnect.
   *
   * @api private
   */

  reconnect(err) {
    // TODO handle other errors
    if (err && err.message && err.message.match(/Unauthorized/)) {
      log(`unauthorized error ${err}`);
      this.emit("error", err);
      return this.close();
    }

    if (this.reconnectingTriedCount > this.reconnectingMaxCount) {
      log(`reconnecting tried ${this.reconnectingMaxCount}, abort`);
      this.emit("error", this.lastError);
      return this.close();
    }

    if (this.reconnectingCheckTimer) {
      clearInterval(this.reconnectingCheckTimer);
      this.reconnectingCheckTimer = void 0;
    }

    var delay;

    if (this.reconnectingTimer) {
      clearTimeout(this.reconnectingTimer);
      this.reconnectingTriedCount += 1;
      delay = this.reconnectingInterval * Math.pow(2, this.reconnectingTriedCount - 1);
    } else {
      this.lastError = err;
      this.reconnectingTriedCount = 0;
      [this.reconnectingInterval, this.reconnectingMaxCount] =
        this.getBackoffStrategySpec(err);
      delay = 0;
    }

    log(`reconnecting after ${delay}ms`);

    this.reconnectingTimer = setTimeout(() => {
      this.client.off();
      this.open();
    }, delay);

    return this;
  }

  /**
   * Return a backoff strategy based on `err`.
   *
   * @api private
   */

  getBackoffStrategySpec(err) {
    // TODO handle TCP/IP level network errors(https://dev.twitter.com/streaming/overview/connecting)
    var strategy = this.backoffStrategies.http_errors;

    if (err instanceof NoDataReceivedError) {
      strategy = this.backoffStrategies.http_errors;
    }

    if (err instanceof TwitterRateLimitError) {
      strategy = this.backoffStrategies.rate_limit_errors;
    }

    if (err instanceof TwitterDisconnectError) {
      strategy = this.backoffStrategies.http_errors;
    }

    if (!strategy || !strategy.interval || !strategy.max_count) {
      throw new TypeError("Invalid strategy setting");
    }

    return [strategy.interval, strategy.max_count];
  }

  setLastDataTimestamp() {
    this.lastDataTimestamp = Date.now();
  }

  /**
   * Set a timer that checks whether data would be received
   * in `this.reconnectingCheckInterval`.
   *
   * @api private
   */

  setReconnectingCheckTimer() {
    this.reconnectingCheckTimer = setInterval(() => {
      if (Date.now() > this.lastDataTimestamp + this.reconnectingCheckTimeoutMs) {
        let messsage = `no data was received since ${this.lastDataTimestamp}`;

        log(messsage);

        clearInterval(this.reconnectingCheckTimer);
        this.reconnectingCheckTimer = void 0;

        this.client
          .once("end", () => this.reconnect(new NoDataReceivedError(messsage)))
          .close();
      }
    }, this.reconnectingCheckInterval);
  }
}
