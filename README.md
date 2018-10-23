# Legman

Legman is a simple library build for streaming in strictly object mode. It was originally designed for logging purpose,
but it can handle any kind of JSON-message-streams.

## How to use

At first you have to install this module into your application:

```bash
npm i --save legman
# OR
yarn add legman
```

After that you can import and use Legman in your code.

### Using Legman in TypeScript

```typescript
import Legman from "legman";

interface IExampleMessagePayload {
    action: string;
    id: string;
    payload: any;
    // ...
}

const loggerLeg = new Legman({app: "Identifier for my application"});
const actionLeg = new Legman();

const actionsFromRestInterface = actionLeg.influx({ context: "rest" });
const actionsFromKafka = actionLeg.influx({ context: "kafka" });

// With sloppy-mode set to true, your resulting stream will not be able to handle back-pressure, but it has a weak
// connection to the base Legman (loggerLeg in this case) and will not leaking memory on this operation.
const processLog = loggerLeg.influx({ context: "processing" }, true);

actionLeg
    .filter((message: IExampleMessagePayload) => message.action === "create")
    .map(({id, payload}: IExampleMessagePayload) => { return {action: "add", id: id, payload}; })
    .on("data", async (message: IExampleMessagePayload) => {
        const logger = processLog.influx({correlationId: message.id});
        logger.write({msg: "Start processing"});
        await someProcessingFn(message);
        // You can also avoid leaking behavior by calling unpipe or end on a Legman which is not in sloppy-mode, but
        // this may cause problems when you write something on an already ended Legman.
        logger.end({msg: "Processing finished"});
    });

actionLeg
    .filter((message: IExampleMessagePayload) => message.action === "update")
    .map((message: IExampleMessagePayload) => { return {id: message.id, action: "add"}; })
    .pipe(yourProcessingStream);
```

### Using Legman in JavaScript

```typescript
const Legman = require("legman");

const loggerLeg = new Legman({app: "Identifier for my application"});
const actionLeg = new Legman();

const actionsFromRestInterface = actionLeg.influx({ context: "rest" });
const actionsFromKafka = actionLeg.influx({ context: "kafka" });

// With sloppy-mode set to true, your resulting stream will not be able to handle back-pressure, but it has a weak
// connection to the base Legman (loggerLeg in this case) and will not leaking memory on this operation.
const processLog = loggerLeg.influx({ context: "processing" }, true);

actionLeg
    .filter((message) => message.action === "create")
    .map(({id, payload}) => { return {action: "add", id: id, payload}; })
    .on("data", async (message) => {
        const logger = processLog.influx({correlationId: message.id});
        logger.write({msg: "Start processing"});
        await someProcessingFn(message);
        // You can also avoid leaking behavior by calling unpipe or end on a Legman which is not in sloppy-mode, but
        // this may cause problems when you write something on an already ended Legman.
        logger.end({msg: "Processing finished"});
    });

actionLeg
    .filter((message) => message.action === "update")
    .map((message) => { return {id: message.id, action: "add"}; })
    .pipe(yourProcessingStream);
```

## Legman methods

Legman provides some methods that NodeJS streams don't provide.

### influx

The `.influx(additionalFields, optionalSloppyMode)` method will create a new Legman instance and pipe its messages into
the base Legman stream. You can use it to build logical blocks according to the origin and enhance these messages with
additional fields.

Example:

```typescript
const baseLeg = new Legman({app: "my-app"});

const userMgmtLeg = baseLeg.influx({context: "user"});
const adminLeg = baseLeg.influx({type: "admin"});
const editorLeg = baseLeg.influx({type: "editor"});

const contentMgmtLeg = baseLeg.influx({context: "content"});
const articlesLeg = contentMgmtLeg.influx({type: "article"});
const tickerLeg = contentMgmtLeg.influx({type: "ticker"});

baseLeg.on("data", (message) => console.log(message));

```

Running `editorLeg.write({msg: "Hello editor"});` will cause this message printed out by the `console.log()` statement
on the `baseLeg`.

```json
{
  "app": "my-app",
  "context": "user",
  "type": "editor"
}
```

With sloppy-mode set to true, your resulting stream will not be able to handle back-pressure, but it has a weak
connection to the base Legman and will prevent leaking memory. It is perfect for streams without a high frequency and no
easy to determine end. For example for logs.

### map

The `.map(mapFn)` method will create a new Legman instance that gets its data from the baseLeg and covert every message
according to the result of the `mapFn`. Keep in mind that Legman is strictly for object mode. You should not convert a
message in something different than a JSON object.

```js
leg.map(({id, name}) => { return {id, name}; });
```

### filter

The `.filter(filterFn)` method will create a new Legman instance that gets its data from the baseLeg and filter messages
according to the result of the `filterFn`. If `filterFn` returns true it will pipe the message, otherwise not.

````js
leg.filter(({display}) => { return display; });
````

## Legman Symbols

Legman uses symbols in messages to add meta data. This gives you the advantage to keep the JSON object small and prevent
conflicts. If you want to use a property in your message that is stored on a symbol just create a sub stream with the
`.map` method like this:

```js
leg.map((message) => {return { ...message, myPropertyFromASymbol: message[anySymbol] }; });
```

### Timestamp

Legman enhances every message with a timestamp as date object on the `Legman.timestampSymbol` property of the message.
You are able to access the timestamp this way:

```js
anyLeg.on("data", (message) => console.log(message[Legman.timestampSymbol]));
```

## Additional Legman modules

Official:

* [legman-kafka](https://npmjs.org/package/legman-kafka)
* [legman-logger](https://npmjs.org/package/legman-logger)
* [legman-logstash](https://npmjs.org/package/legman-logstash)

Unofficial:

*Please make a PR for adding your Legman module here...*

## Architectural principles

To provide quality on maintainability, performance and security Legman modules should follow these architectural
principles.

### Principles for this core library

This module follows the following principles:

* Legman should use native NodeJS functions as much as possible.
* Legman streams are extended from NodeJS stream.
* Legman should handle back-pressure in streams.
* A chunk must be an object representing a message. Strings and Buffers will be transformed into an object on property
`msg`.
* Legman enhances every message with a timestamp property or use the one from the message payload.
* Legman instances enhance messages with optional given `additionalFields`.
* Should handle objects immutable.
* Should have unit and leakage tests with a good coverage. Leakage tests should also include leaking scenarios for
showing them up.
* Not pollute messages by enhancing them with meta data. Use symbols instead.
* A Message should not have circular structures. You should always convert them into stringified JSON. Use also symbols
for properties with circular structures instead.

### Principles for libraries enhancing this core

Principles for libraries based on this core library are divided into the three base types, according to the types of 
streams in NodeJS and one for common principles.

#### Common

* Keep in mind that you don't need special objects / streams for Legman. An original NodeJS stream in object-mode is
everything legman needs to work with. Consider using an existing library and write its content into a Legman before
writing a special module.
* Consider extending from Legman itself instead of using NodeJS's passthrough or transform streams. It will provide the
filter, map and influx methods.
* Not pollute messages by enhancing them with meta data. Use symbols instead.

#### Readable streams (Input)

* Must be an instance of a NodeJS readable stream in object mode.
* Consider using a Legman and simply write into it.
* You should implement back-pressure if it is applicable.

#### Transform streams

* Should (really) be an instance of a Legman.
* Must be an instance of readable and writable stream in object mode.

#### Writable streams (Output)

* Must be an instance of a NodeJS writable stream in object mode.

*Note: A transform stream in NodeJS for example is an instance of readable **and** writable stream!*

## Script tasks

* `transpile`: Transpiles the library from TypeScript into JavaScript with type declarations
* `lint`: Lints your code against the recommend TSLint ruleset.
* `test`: Transpiles, lints and runs software-tests with coverage.
* `leakage`: Transpiles, lints and runs software-tests with leakage tests.
* `docker:lint`: Runs the `lint` task in a docker environment.
* `docker:test`: Runs the `test` task in a docker environment.
* `docker:leakage`: Runs the `leakage` task in a docker environment.

## License

This module is under [ISC license](LICENSE) copyright 2018 by [Arne Schubert](mailto:atd.schubert@gmail.com)
