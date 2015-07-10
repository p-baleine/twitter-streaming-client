import Emitter from "component-emitter";
import expect from "expect.js";
import fs from "fs";
import request from "request";
import sinon from "sinon";
import TwitterRateLimitError from "../src/twitter-rate-limit-error";
import TwitterStreamingClient from "../src/client";

describe("TwitterStreamingClient", () => {
  it("should be an instance of Emitter", () => {
    expect(new TwitterStreamingClient("http://google.com")).to.be.a(Emitter);
  });

  describe("#open()", () => {
    beforeEach(() => {
      sinon.spy(request, "post");
    });

    afterEach(() => {
      request.post.restore();
    });

    it("should request to specified endpoint", () => {
      var client = new TwitterStreamingClient("http://google.com");
      client.open();
      expect(request.post.firstCall.args[0].url).to.match(/http:\/\/google\.com/);
    });

    it("should request with specified oauth params", () => {
      var client = new TwitterStreamingClient("http://google.com", { consumer_key: "abc" });
      client.open();
      expect(request.post.firstCall.args[0].oauth).to.have.property("consumer_key", "abc");
    });

    it("should request with `delimited=length` parameter", () => {
      var client = new TwitterStreamingClient("http://google.com", { consumer_key: "abc" });
      client.open();
      expect(request.post.firstCall.args[0].url).to.contain("delimited=length");
    });
  });

  describe("Request events", () => {
    beforeEach(function() {
      this.fakeRequest = new Emitter();
      sinon.stub(request, "post", () => this.fakeRequest);
    });

    afterEach(() => {
      request.post.restore();
    });

    describe("when an `data` event is emitted from Request object", () => {
      var prepareFixtures = (() => {
        var fixtureFiles = fs.readdirSync(`${__dirname}/fixtures`);
        var chunks = fixtureFiles.map((file) => fs.readFileSync(`${__dirname}/fixtures/${file}`, { encoding: "utf8" }));
        var messages = chunks.join("")
          .replace(/^\d+$/gm, "")
          .split(/\r\n/)
          .filter((line) => line.length !== 0)
          .map((jsonStr) => JSON.parse(jsonStr));

        return () => {
          return {
            chunks: chunks,
            messages: messages
          };
        };
      })();

      it("should emit `status` events", function() {
        var {chunks, messages} = prepareFixtures();
        var notifiedStatuses = messages.filter((m) => m.text);
        var onTweet = sinon.spy();
        var client = new TwitterStreamingClient("http://google.com", {});

        client.on("status", onTweet);
        client.open();
        chunks.forEach((chunk) => this.fakeRequest.emit("data", chunk));

        expect(onTweet.callCount).to.equal(notifiedStatuses.length);
        expect(onTweet.args.map((arg) => arg[0].text))
          .to.eql(notifiedStatuses.map((s) => s.text));
      });

      it("should emit `delete` events", function() {
        var {chunks, messages} = prepareFixtures();
        var notifiedDeletions = messages.filter((m) => m.delete);
        var onDelete = sinon.spy();
        var client = new TwitterStreamingClient("http://google.com", {});

        client.on("delete", onDelete);
        client.open();
        chunks.forEach((chunk) => this.fakeRequest.emit("data", chunk));

        expect(onDelete.callCount).to.equal(notifiedDeletions.length);
      });

      it("should emit `friends` events", function() {
        var {chunks, messages} = prepareFixtures();
        var notifiedFriends = messages.filter((m) => m.friends);
        var onFriends = sinon.spy();
        var client = new TwitterStreamingClient("http://google.com", {});

        client.on("friends", onFriends);
        client.open();
        chunks.forEach((chunk) => this.fakeRequest.emit("data", chunk));

        expect(onFriends.callCount).to.equal(notifiedFriends.length);
      });

      it("should emit `favorite` events", function() {
        var onFavorite = sinon.spy();
        var client = new TwitterStreamingClient("http://google.com", {});

        client.on("favorite", onFavorite);
        client.open();

        this.fakeRequest.emit("data", "35\r\n{\"event\":\"favorite\",\"target\":\"123\"}");

        expect(onFavorite.callCount).to.equal(1);
      });
    });

    describe("when an `error` event is emitted from Request object", () => {
      it("should emit `error` event", function(done) {
        var client = new TwitterStreamingClient("http://google.com", { consumer_key: "abc" });

        client.on("error", (error) => {
          expect(error).to.equal("error message");
          done();
        });

        client.open();
        this.fakeRequest.emit("error", "error message");
      });
    });

    describe("when an `response` event is emitted from Request object", () => {
      describe("when the status code is 200", () => {
        it("should emit `response` event", function(done) {
          var client = new TwitterStreamingClient("http://google.com", { consumer_key: "abc" });

          client.on("response", () => done());

          client.open();
          this.fakeRequest.emit("response", { statusCode: 200 });
        });
      });

      describe("when the status code is 420", () => {
        it("should emit `error` event with a TwitterRateLimitError object", function(done) {
          var client = new TwitterStreamingClient("http://google.com", { consumer_key: "abc" });

          client.on("error", (err) => {
            expect(err).to.be.a(TwitterRateLimitError);
            done();
          });

          client.open();
          this.fakeRequest.emit("response", { statusCode: 420 });
        });
      });

      describe("when the status code is other than 200 and 420", () => {
        it("should emit `error` event with an Error object", function(done) {
          var client = new TwitterStreamingClient("http://google.com", { consumer_key: "abc" });

          client.on("error", (err) => {
            expect(err).to.be.a(Error);
            done();
          });

          client.open();
          this.fakeRequest.emit("response", { statusCode: 500 });
        });
      });
    });
  });
});
