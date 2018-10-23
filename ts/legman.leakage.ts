import { iterate } from "leakage";
import Legman from "./";

const defaultTimeout = 60000; // sorry for that, but leakage tests take a lot of time!
const leakingTestIterations = 10;
const unleakingTestIterations = 100;
function noop(): void {
    // do nothing...
}
function sleep(ms = 1000): Promise<void> {
    return new Promise((resolve) => void setTimeout(resolve, ms));
}

describe("Legman leakage tests", () => {
    describe("un-leaky", () => {
        it("should not leak while sending messages with a consumer", () => {
            const base = new Legman({additional: "fields"});
            base.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    base.write({msg: "test"});
                }
                return sleep(1);
            });
        }).timeout(defaultTimeout);
        it("should not leak while creating influx streams and unpipe / end them", async () => {
            const base = new Legman({additional: "fields"});
            base.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    const sub = base.influx({ sub: 1 });
                    sub.write({ msg: "test" });
                    sub.end();
                }
                return sleep(5);
            });
        }).timeout(defaultTimeout);
        it("should not leak while creating influx streams and unpipe / end them with a message", async () => {
            const base = new Legman({additional: "fields"});
            base.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    const sub = base.influx({ sub: 1 });
                    sub.write({ msg: "test" });
                    sub.end({ msg: "end" });
                }
                return sleep(5);
            });
        }).timeout(defaultTimeout);
        it("should not leak while creating mapped streams with consumer", async () => {
            const base = new Legman({additional: "fields"});
            const mapped = base.map((message: {additional: string}) => {
                return {mapped: message.additional};
            });
            mapped.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    base.write({msg: "test"});
                }
                return sleep(1);
            });
        }).timeout(defaultTimeout);
        it("should not leak while creating filtered streams with consumer", async () => {
            const base = new Legman({additional: "fields"});
            const filtered = base.filter((message: { filter: boolean }) => !message.filter);
            filtered.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    base.write({filter: !Math.round(Math.random())});
                }
                return sleep(1);
            });
        }).timeout(defaultTimeout);
        it("should leak while creating influx streams in sloppy mode", async () => {
            const base = new Legman({additional: "fields"});
            base.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    const sub = base.influx({sub: 1}, true);
                    sub.write({msg: "test"});
                }
                return sleep(1);
            });
        }).timeout(defaultTimeout);
    });
    describe("leaky", () => {
        it("should leak while sending messages without a consumer", () => {
            const base = new Legman({additional: "fields"});
            const noError = new Error("No error was emitted");
            return iterate.async(() => {
                for (let i = 0; i < leakingTestIterations; i += 1) {
                    base.write({msg: "test"});
                }
                return sleep(1);
            })
                .then(() => {
                    throw noError;
                })
                .catch((err) => { if (err === noError) {throw noError; }});
        }).timeout(defaultTimeout);
        it("should leak while creating influx streams without unpiping them", async () => {
            const base = new Legman({additional: "fields"});
            const noError = new Error("No error was emitted");
            base.on("data", noop);
            return iterate.async(() => {
                for (let i = 0; i < leakingTestIterations; i += 1) {
                    const sub = base.influx({sub: 1});
                    sub.write({msg: "test"});
                }
                return sleep(1);
            })
                .then(() => {
                    throw noError;
                })
                .catch((err) => { if (err === noError) {throw noError; }});
        }).timeout(defaultTimeout);
        it("should leak while creating mapped streams without consuming", async () => {
            const base = new Legman({additional: "fields"});
            const noError = new Error("No error was emitted");
            base.map((message: {additional: string}) => {
                return {mapped: message.additional};
            });
            return iterate.async(() => {
                for (let i = 0; i < leakingTestIterations; i += 1) {
                    base.write({msg: "test"});
                }
                return sleep(1);
            })
                .then(() => {
                    throw noError;
                })
                .catch((err) => { if (err === noError) {throw noError; }});
        }).timeout(defaultTimeout);
        it("should leak while creating filtered streams without consuming", async () => {
            const base = new Legman({additional: "fields"});
            const noError = new Error("No error was emitted");
            base.filter((message: { filter: boolean }) => !message.filter);
            return iterate.async(() => {
                for (let i = 0; i < unleakingTestIterations; i += 1) {
                    base.write({filter: !Math.round(Math.random())});
                }
                return sleep(1);
            })
                .then(() => {
                    throw noError;
                })
                .catch((err) => { if (err === noError) {throw noError; }});
        }).timeout(defaultTimeout);
    });
});
