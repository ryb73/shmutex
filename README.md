# shmutex
Simple shared mutex (or read/write lock) for JS. Lock lifecycle can be encapsulated by a function call or a promise.

Clients can request either an "exclusive" (write) or "shared" (read) lock. If an exclusive lock is held, no other locks can be acquired. If any read lock is held, other read locks can be acquired but no exclusive locks can be acquired.

API:

- `lock(func, exclusive = false)`
  - Requests lock and fires `func` when the lock is acquired. If `func` returns a thenable, the lock will be released when the thenable resolves. Otherwise, the lock is released when `func` returns.
- `read(func)`
  - Alias for `lock(func)`
- `write(func)`
  - Alias for `lock(func, true)`

Example:

```javascript
"use strict";

const shmutex = require("shmutex"),
      q       = require("q");

let myShmutex = shmutex(),
    sharedString = "";

let startMs = Date.now();

write("Write #1", "oh", 5000);
read("Read  #3", 10000);
read("Read  #2", 5000);
read("Read  #1", 2500);
write("Write #2", "hi", 5000);
q().delay(16000)
    .done(() => read("Read  #4", 500));

// Output:
//  Write #1 (5004ms): oh
//  Read  #3 (7526ms): oh
//  Read  #2 (10028ms): oh
//  Read  #1 (15027ms): oh
//  Write #2 (20029ms): hi
//  Read  #4 (20530ms): hi

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
