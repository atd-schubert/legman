import { expect } from "chai";
import { PassThrough } from "stream";
import Legman from "./";
import { isALegmanTransformer } from "./spec";

describe("Legman", () => {
    isALegmanTransformer(new Legman());
    describe("influx", () => {
        const baseLegman = new Legman({first: "base"});
        const subLegman = baseLegman.influx({second: "sub"});
        it("should be a new instance of a Legman", () => {
            expect(subLegman).instanceOf(Legman);
        });
        it("should not be equal to the base Legman", () => {
            expect(subLegman).not.equal(baseLegman);
        });
        it("should pipe to the base leg", (done: Mocha.Done) => {
            const testMessage = { msg: "sub leg message" };
            baseLegman.once("data", (receivedMessage) => {
                expect(receivedMessage).deep.equal({
                    ...{first: "base", second: "sub"},
                    ...testMessage,
                });
                done();
            });
            subLegman.write(testMessage);
        });
    });
    describe("filter", () => {
        const baseLegman = new Legman();
        const filteredLegman = baseLegman.filter((message: any) => {
            return !message.filtered;
        });
        it("should only pass-through messages that does not match the filter", (done: Mocha.Done) => {
            filteredLegman.once("data", (message: any) => {
                expect(message.msg).equal("You should get this message");
                done();
            });
            baseLegman.write({msg: "You should not get this message", filtered: true});
            baseLegman.write({msg: "You should get this message"});
        });
    });
    describe("map", () => {
        const baseLegman = new Legman();
        const mappedLegman = baseLegman.map((message: any) => {
            return {mapped: true, msg: message.msg + message.msg};
        });
        it("should pipe the mapped messages", (done: Mocha.Done) => {
            mappedLegman.once("data", (message: any) => {
                expect(message.msg).equal("You should get this message twiceYou should get this message twice");
                expect(message.mapped).equal(true);
                done();
            });
            baseLegman.write({msg: "You should get this message twice"});
        });
    });
    describe("end", () => {
        it("should not end the base stream when ending an influx stream", () => {
            const baseLeg = new Legman();
            const influxLeg = baseLeg.influx();
            influxLeg.end();
            baseLeg.write({msg: "This should still work!"});
        });
        it("should not end the base stream when ending a stream piped into an influx stream", () => {
            const baseLeg = new Legman();
            const influxLeg = baseLeg.influx();
            const passthrough = new PassThrough();
            passthrough.pipe(influxLeg);
            passthrough.end();
            influxLeg.write({msg: "This should still work!"});
            baseLeg.write({msg: "This should still work!"});
        });
    });
    describe("piping messages", () => {
        context("without consumer", () => {
            const leg = new Legman();
            it("should hold back messages until they get requested", (done: Mocha.Done) => {
                const testMessage = {msg: "this message should last", loglevel: "warn"};

                leg.write(testMessage);
                leg.write(testMessage);
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal(testMessage);
                    done();
                });
                leg.write(testMessage);
            });
            it("should get a copy of the previous created object", (done: Mocha.Done) => {
                const testMessage = {msg: "without timestamp", loglevel: "info"};
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal(testMessage);
                    done();
                });
                leg.write(testMessage);
            });
        });
        context("with defaultFields", () => {
            const defaultFields = { default: true };
            const leg = new Legman(defaultFields);
            it("should merge default fields with message", (done: Mocha.Done) => {
                const testMessage = {msg: "with timestamp", loglevel: "info", timestamp: 1234};
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal({...defaultFields, ...testMessage});
                    done();
                });
                leg.write(testMessage);
            });
            it("should merge default fields with message", (done: Mocha.Done) => {
                const testMessage = {msg: "without timestamp", loglevel: "info"};
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal({
                        ...defaultFields,
                        ...testMessage,
                    });
                    done();
                });
                leg.write(testMessage);
            });
            it("should overwrite default fields", (done: Mocha.Done) => {
                const testMessage = {msg: "without timestamp", loglevel: "info", default: "it works"};
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal({
                        ...defaultFields,
                        ...testMessage,
                    });
                    done();
                });
                leg.write(testMessage);
            });
        });
        context("with timestamp", () => {
            const leg = new Legman();
            it("should enhance a timestamp when your message has none", (done: Mocha.Done) => {
                const testMessage = { msg: "without timestamp" };
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage[Legman.timestampSymbol]).instanceOf(Date);
                    done();
                });
                leg.write(testMessage);
            });
            it("should use an existing timestamp when your message has one", (done: Mocha.Done) => {
                const testMessage = { msg: "without timestamp", [Legman.timestampSymbol]: new Date() };
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage[Legman.timestampSymbol]).equal(testMessage[Legman.timestampSymbol]);
                    done();
                });
                leg.write(testMessage);
            });
            it("should not use an existing timestamp from the additional fields", (done: Mocha.Done) => {
                const date = new Date();
                const timestampLeg = leg.influx({ [Legman.timestampSymbol]: date });
                const testMessage = { msg: "without timestamp"  };
                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage[Legman.timestampSymbol]).instanceOf(Date);
                    expect(receivedMessage[Legman.timestampSymbol]).not.equal(date);
                    done();
                });
                timestampLeg.write(testMessage);
            });
        });
        context("message is not an object", () => {
            const leg = new Legman();
            it("should convert a string into an object with loglevel `log`", (done: Mocha.Done) => {
                const testMessage = "just a string";

                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal({
                        loglevel: "log",
                        msg: testMessage,
                    });
                    done();
                });
                leg.write(testMessage);
            });
            it("should convert an error into an object", (done: Mocha.Done) => {
                const testMessage = new Error("just an error");

                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal({
                        loglevel: "error",
                        msg: testMessage.message,
                        name: testMessage.name,
                        stack: testMessage.stack,
                    });
                    done();
                });
                leg.write(testMessage);
            });
            it("should convert a buffer into an object, but keeps the buffer as msg property", (done: Mocha.Done) => {
                const testMessage = Buffer.from("just a buffer");

                leg.once("data", (receivedMessage) => {
                    expect(receivedMessage).deep.equal({
                        msg: testMessage,
                    });
                    done();
                });
                leg.write(testMessage);
            });
        });
    });
});
