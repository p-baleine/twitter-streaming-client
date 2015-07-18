import Emitter from "component-emitter";
import expect from "expect.js";
import ReconnectingProxy from "../src/reconnecting-proxy";
import sinon from "sinon";

class FakeClient extends Emitter {
  open() { return this; }
  close() { return this; }
}

describe("ReconnectingProxy", () => {
  beforeEach(function() {
    this.fakeClient = new FakeClient();
  });

  describe("when an `error` event is emitted from the client", () => {
    it("should close client", function() {
      var proxy = new ReconnectingProxy(this.fakeClient);
      var spy = sinon.spy(this.fakeClient, "close");

      proxy.open();
      this.fakeClient.emit("error", "abc");

      expect(spy.called).to.be.ok();
    });
  });
});
