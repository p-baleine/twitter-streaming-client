import expect from "expect.js";
import nock from "nock";
import {Readable} from "stream";
import ReconnectingProxy from "../src/reconnecting-proxy";
import sinon from "sinon";
import TwitterStreamClient from "../src/client";

// Dummy response class to test delayed response.
class DelayedResponse extends Readable {
  constructor(interval) {
    super();

    this.interval = interval;
    this.called = false;
    this.intervalElappsed = false;

    setTimeout(() => {
      this.intervalElappsed = true;
    }, this.interval);
  }

  _read() {
    if (!this.called) {
      this.push("17\r\n{ \"text\": \"aaa\" }");
      this.called = true;
    } else if (this.intervalElappsed) {
      this.push(null);
    }
  }
}

describe("reconnecting", () => {
  beforeEach(function() {
    nock.disableNetConnect();
    this.endpoint = "https://userstream.twitter.com";
    this.path = "/1.1/user.json";
  });

  describe("when no data was received from endpoint during specified interval", function() {
    this.timeout(1200);

    beforeEach(function() {
      this.scope = nock(this.endpoint)
        .post(this.path).query({ delimited: "length" }).reply(200, () => new DelayedResponse(910))
        .post(this.path).query({ delimited: "length" }).reply(200);
      this.client = new TwitterStreamClient(`${this.endpoint}${this.path}`);
      this.proxy = new ReconnectingProxy(this.client, { reconnecting_check_timeout_ms: 900 });
    });

    it("should disconnect immediately", function(done) {
      var spy = sinon.spy(this.client, "close");
      this.proxy.open();

      setTimeout(() => {
        expect(spy.called).to.be.ok();
        this.proxy.close();
        done();
      }, 1100);
    });

    it("should reconnect immediately after disconnectig", function(done) {
      var spy = sinon.spy(this.client, "open");
      this.proxy.open();

      setTimeout(() => {
        expect(spy.callCount).to.be.greaterThan(1);
        this.proxy.close();
        done();
      }, 1100);
    });
  });

  describe("backoff strategies", function() {
    this.timeout(1300);

    describe("when the cause of reconnecting is timeout of reconnecting timer", () => {
      beforeEach(function() {
        this.scope = nock(this.endpoint)
          .post(this.path).query({ delimited: "length" }).reply(200, () => new DelayedResponse(910))
          .post(this.path).query({ delimited: "length" }).reply(500)
          .post(this.path).query({ delimited: "length" }).reply(200);

        this.client = new TwitterStreamClient(`${this.endpoint}${this.path}`);
        this.proxy = new ReconnectingProxy(this.client, {
          reconnecting_check_timeout_ms: 900,
          backoff_strategies: {
            http_errors: { interval: 50, max_count: 7 }
          }
        });
      });

      it("should try to reconnect after http_errors interval", function(done) {
        this.proxy.open();

        setTimeout(() => {
          this.scope.done();
          this.proxy.close();
          done();
        }, 900 + 0 + 50 /* margin */+ 300);
      });
    });

    describe("when the cause of reconnecting is Rate Limit Error", () => {
      beforeEach(function() {
        this.scope = nock(this.endpoint)
          .post(this.path).query({ delimited: "length" }).reply(420)
          .post(this.path).query({ delimited: "length" }).reply(420)
          .post(this.path).query({ delimited: "length" }).reply(200);

        this.client = new TwitterStreamClient(`${this.endpoint}${this.path}`);
        this.proxy = new ReconnectingProxy(this.client, {
          reconnecting_check_timeout_ms: 900,
          backoff_strategies: {
            rate_limit_errors: { interval: 40, max_count: 7 }
          }
        });
      });

      it("should try to reconnect after rate_limit_errors interval", function(done) {
        this.proxy.open();

        setTimeout(() => {
          this.scope.done();
          this.proxy.close();
          done();
        }, 0 + 40 /* margin */ + 300);
      });
    });
  });

  describe("when the status code of response is 401", () => {
    beforeEach(function() {
      this.scope = nock(this.endpoint)
        .post(this.path)
        .query({ delimited: "length" })
        .reply(401, "Unauthorized");
      this.client = new ReconnectingProxy(
        new TwitterStreamClient(`${this.endpoint}${this.path}`));
    });

    it("should emit error `Unauthorized`", function(done) {
      this.client
        .on("error", (err) => {
          expect(err.message).to.equal("Unauthorized");
          this.scope.done();
          done();
        })
        .open();
    });
  });
});
