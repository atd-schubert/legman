import { Transform, TransformCallback } from "stream";

/* tslint:disable:max-classes-per-file */

export class Legman extends Transform {
    public static readonly timestampSymbol = Symbol("timestamp");
    constructor(public defaultFields: object = {}) {
        super({objectMode: true});
    }

    /**
     * Ending a stream should not end the next stream. It must un-pipe itself first.
     */
    public end(message?: any) {
        if (message) {
            this.write(message);
            return process.nextTick(() => this.end());
        }
        this.unpipe();
        super.end();
    }

    /**
     * Transform method from node's PassThrough stream abstract
     */
    public _transform(message: object | string | Buffer | Error, encoding: string, callback: TransformCallback): void {
        try {
            if (Buffer.isBuffer(message)) {
                message = { msg: message };
            } else if (message instanceof Error) {
                message = {
                    ...message,
                    loglevel: "error",
                    msg: message.message, name: message.name, stack: message.stack,
                };
            } else if (typeof message === "string") {
                message = { loglevel: "log", msg: message };
            }
            this.push({...this.defaultFields, [Legman.timestampSymbol]: new Date(), ...message});
            return callback();
        } catch (err) {
            return callback(err);
        }
    }

    // Input streams to base Legman
    /**
     * Creates a new Legman stream with additional fields that influxes into the base (this) stream.
     */
    public influx(additionalFields?: any, sloppy = false): Legman {
        const subLegman = new Legman(additionalFields);
        if (sloppy) {
            subLegman.on("data", (message) => this.write(message));
            return subLegman;
        }
        subLegman.pipe(this);
        return subLegman;
    }

    // Output streams to base Legman
    /**
     * Creates a new stream only with the filtered chunks
     */
    public filter(filterFn: (message: any) => boolean): Legman {
        const filteredLegman = new Filter(filterFn);
        return this.pipe(filteredLegman);

    }
    /**
     * Creates a new stream with mapped chunks.
     */
    public map(mapFn: (message: any) => any): Legman {
        const mappedLegman = new Map(mapFn);
        return this.pipe(mappedLegman);
    }
}

/**
 * A MapStream works like the map method for arrays. Your map function will receive an object for each message-chunk and
 * you are able to map it into another object.
 *
 * *Note: The design of this library will not expect return values of that map function other then objects!*
 */
class Map extends Legman {
    constructor(protected mapFn: (message: any) => object) {
        super();
    }
    /**
     * Transform method from node's PassThrough stream abstract
     */
    public _transform(message: object, encoding: string, callback: TransformCallback): void {
        try {
            this.push(this.mapFn(message));
            callback();
        } catch (err) {
            return callback(err);
        }
    }
}

class Filter extends Legman {
    constructor(protected filterFn: (message: any) => boolean) {
        super({objectMode: true});
    }
    /**
     * Transform method from node's PassThrough stream abstract
     */
    public _transform(message: any, encoding: string, callback: TransformCallback): void {
        try {
            if (this.filterFn(message)) {
                this.push(message);
            }
            callback();
        } catch (err) {
            return callback(err);
        }
    }
}
