"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _componentEmitter = require("component-emitter");

var _componentEmitter2 = _interopRequireDefault(_componentEmitter);

var _twitterRateLimitError = require("./twitter-rate-limit-error");

var _twitterRateLimitError2 = _interopRequireDefault(_twitterRateLimitError);

var log = (0, _debug2["default"])("twitter-streaming-client");

/**
 * Error class that represents receiving no data.
 */

var NoDataReceivedError = (function (_Error) {
  function NoDataReceivedError() {
    _classCallCheck(this, NoDataReceivedError);

    var tmp = _get(Object.getPrototypeOf(NoDataReceivedError.prototype), "constructor", this).call(this, arguments);
    this.origin = tmp;
    this.name = "NoDataReceivedError";
  }

  _inherits(NoDataReceivedError, _Error);

  _createClass(NoDataReceivedError, [{
    key: "stack",
    get: function get() {
      return this.origin.stack;
    }
  }]);

  return NoDataReceivedError;
})(Error);

/**
 * Proxy class that manages reconnecting.
 */

var ReconnectingProxy = (function (_Emitter) {

  /**
   * Constructor.
   *
   * @param {TwitterStreamingClient} client
   * @param {Object} options
   * @api public
   */

  function ReconnectingProxy(client, options) {
    _classCallCheck(this, ReconnectingProxy);

    _get(Object.getPrototypeOf(ReconnectingProxy.prototype), "constructor", this).call(this);

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

  _inherits(ReconnectingProxy, _Emitter);

  _createClass(ReconnectingProxy, [{
    key: "open",

    /**
     * Open client's connection.
     *
     * @param {Object} params Options carry over to `request` methods.
     * @api public
     */

    value: function open(params) {
      var _this = this;

      this.client.open(params).on("response", function () {
        if (_this.reconnectingTimer) {
          clearTimeout(_this.reconnectingTimer);
          _this.reconnectingTimer = null;
        }
      }).on("data", function () {
        return _this.setLastDataTimestamp();
      }).on("status", function (status) {
        return _this.emit("status", status);
      }).on("delete", function (status) {
        return _this.emit("delete", status);
      }).on("friends", function (friends) {
        return _this.emit("friends", friends);
      })
      // ...
      .on("error", function (err) {
        return _this.reconnect(err);
      });

      this.setReconnectingCheckTimer();

      return this;
    }
  }, {
    key: "close",

    /**
     * Close client's connection.
     *
     * @api public
     */

    value: function close() {
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
  }, {
    key: "reconnect",

    /**
     * Try to reconnect.
     *
     * @api private
     */

    value: function reconnect(err) {
      var _this2 = this;

      // TODO handle other errors
      if (err && err.message && err.message.match(/Unauthorized/)) {
        return this.emit("error", err);
      }

      if (this.reconnectingTriedCount > this.reconnectingMaxCount) {
        log("reconnecting tried " + this.reconnectingMaxCount + ", abort");
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

        var _getBackoffStrategySpec = this.getBackoffStrategySpec(err);

        var _getBackoffStrategySpec2 = _slicedToArray(_getBackoffStrategySpec, 2);

        this.reconnectingInterval = _getBackoffStrategySpec2[0];
        this.reconnectingMaxCount = _getBackoffStrategySpec2[1];

        delay = 0;
      }

      log("reconnecting after " + delay + "ms");

      this.reconnectingTimer = setTimeout(function () {
        _this2.client.off();
        _this2.open();
      }, delay);

      return this;
    }
  }, {
    key: "getBackoffStrategySpec",

    /**
     * Return a backoff strategy based on `err`.
     *
     * @api private
     */

    value: function getBackoffStrategySpec(err) {
      // TODO handle TCP/IP level network errors(https://dev.twitter.com/streaming/overview/connecting)
      var strategy = this.backoffStrategies.http_errors;

      if (err instanceof NoDataReceivedError) {
        strategy = this.backoffStrategies.http_errors;
      }

      if (err instanceof _twitterRateLimitError2["default"]) {
        strategy = this.backoffStrategies.rate_limit_errors;
      }

      if (!strategy || !strategy.interval || !strategy.max_count) {
        throw new TypeError("Invalid strategy setting");
      }

      return [strategy.interval, strategy.max_count];
    }
  }, {
    key: "setLastDataTimestamp",
    value: function setLastDataTimestamp() {
      this.lastDataTimestamp = Date.now();
    }
  }, {
    key: "setReconnectingCheckTimer",

    /**
     * Set a timer that checks whether data would be received
     * in `this.reconnectingCheckInterval`.
     *
     * @api private
     */

    value: function setReconnectingCheckTimer() {
      var _this3 = this;

      this.reconnectingCheckTimer = setInterval(function () {
        if (Date.now() > _this3.lastDataTimestamp + _this3.reconnectingCheckTimeoutMs) {
          (function () {
            var messsage = "no data was received since " + _this3.lastDataTimestamp;

            log(messsage);

            clearInterval(_this3.reconnectingCheckTimer);
            _this3.reconnectingCheckTimer = void 0;

            _this3.client.once("end", function () {
              return _this3.reconnect(new NoDataReceivedError(messsage));
            }).close();
          })();
        }
      }, this.reconnectingCheckInterval);
    }
  }]);

  return ReconnectingProxy;
})(_componentEmitter2["default"]);

exports["default"] = ReconnectingProxy;
module.exports = exports["default"];