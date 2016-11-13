# shmutex
Simple shared mutex (or read/write lock) for JS. Can optionally release locks upon resolution of a promise.

Example:

```javascript
"use strict";

const shmutex = require("shmutex"),
      q       = require("q");

let myShmutex = shmutex(),
    sharedString = "";

let startMs = Date.now();

write("First write", "oh", 5000);
read("First read", 10000);
read("Second read", 5000);
read("Third read", 2500);
write("Second write", "hi", 5000);
q().delay(16000)
    .done(() => read("Fourth read", 500));

// Output:
//  First write (5004ms): oh
//  Third read (7526ms): oh
//  Second read (10028ms): oh
//  First read (15027ms): oh
//  Second write (20029ms): hi
//  Fourth read (20530ms): hi

function read(label, delay) {
    myShmutex.read(() => {
        return q()
            .delay(delay)
            .then(() => printProgress(label));
    });
}

function write(label, value, delay) {
    myShmutex.write(() => {
        return q()
            .delay(delay)
            .then(() => {
                sharedString = value;
                printProgress(label);
            });
    });
}

function printProgress(label) {
    let elapsed = Date.now() - startMs;
    console.log(`${label} (${elapsed}ms): ${sharedString}`);
}
```