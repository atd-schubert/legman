import { expect } from "chai";
import { Readable, Writable } from "stream";

export function isALegmanSource(target: any) {
    describe("Is a valid Legman source", () => {
        it("should be an instance of a readable stream", () => expect(target).instanceOf(Readable));
    });
}
export function isALegmanTarget(target: any) {
    describe("Is a valid Legman target", () => {
        it("should be an instance of a writable stream", () => expect(target).instanceOf(Writable));
        it("should accept objects as chunks", () => {
            target.write({test: true});
        });
    });
}
export function isALegmanTransformer(target: any) {
    describe("Is a valid Legman transformer", () => {
        it("should be an instance of a readable stream", () => expect(target).instanceOf(Readable));
        it("should be an instance of a writable stream", () => expect(target).instanceOf(Writable));
        it("should accepts objects as input and outputs objects also", (done: Mocha.Done) => {
            target.once("data", (chunk: object) => {
                expect(chunk).instanceOf(Object);
                done();
            });
            target.write({test: true});
        });
    });
}
