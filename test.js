/* eslint-env mocha */

"use strict";

const assert  = require("chai").assert,
      q       = require("q"),
      _       = require("lodash"),
      shmutex = require(".");

describe("shmutex", function() {
    it("supports exclusion", function(done) {
        let mut = shmutex();

        let val = false;

        mut.lock(() => {
            return q()
                .delay(100)
                .then(() => { val = true; });
        }, true);

        mut.lock(() => {
            assert.isTrue(val);
            done();
        }, true);
    });

    it("allows multiple simultaneous readers", function() {
        let mut = shmutex();

        let count = 0;

        _.times(10, () => {
            mut.lock(() => {
                ++count;
                return q.defer().promise; // never resolve, meaning lock never released
            });
        });

        assert.equal(count, 10);
    });

    it("disallows writers until all readers done", function(done) {
        let mut = shmutex();

        let count = 0;

        // Order of events:
        //  - 1 shared lock acquired, let go after 200ms
        //  - 1 exclusive lock requested, acquired after 200ms
        //  - 9 shared locks acquired, let got after 100ms

        mut.lock(() => {
            return q()
                .delay(200)
                .then(() => ++count);
        });

        mut.lock(() => {
            assert.equal(count, 10);
            done();
        }, true);

        _.times(9, () => {
            mut.lock(() => {
                return q()
                    .delay(100)
                    .then(() => ++count);
            });
        });
    });

    describe("uses fifo when there are no running jobs", function() {
        it("exclusive", function(done) {
            let mut = shmutex();

            let arr = [];

            // Events queued in this order:
            //  - Exclusive
            //  - Exclusive
            //  - Shared
            // The events should run in this order.

            mut.lock(() => {
                return q()
                    .delay(50)
                    .then(() => arr.push(1));
            }, true);

            mut.lock(() => {
                assert.deepEqual(arr, [ 1 ]);
                done();
            }, true);

            mut.lock(() => {
                arr.push(2);
            });
        });

        it("shared", function(done) {
            let mut = shmutex();

            let arr = [];

            // Events queued in this order:
            //  - Exclusive
            //  - Shared
            //  - Exclusive
            // The events should run in this order.

            mut.lock(() => {
                return q()
                    .delay(50)
                    .then(() => arr.push(1));
            }, true);

            mut.lock(() => {
                assert.deepEqual(arr, [ 1 ]);
                done();
            });

            mut.lock(() => {
                arr.push(2);
            }, true);
        });
    });

    describe("returns a promise", function() {
        it("for result of returned promise", function() {
            let mut = shmutex();

            let qResult = mut.lock(() => q(100));

            return qResult.then((val) => {
                assert.equal(val, 100);
            });
        });

        it("for result of returned value", function() {
            let mut = shmutex();

            let qResult = mut.lock(() => 100);

            return qResult.then((val) => {
                assert.equal(val, 100);
            });
        });

        it("for rejected promise", function(done) {
            let mut = shmutex();

            let rejection = new Error("rejection");

            let qResult = mut.lock(() => q.reject(rejection));

            qResult.catch((error) => {
                assert.equal(error, rejection);
                done();
            });
        });

        it("for null rejection", function(done) {
            let mut = shmutex();

            let rejection = null;

            let qResult = mut.lock(() => q.reject(rejection));

            qResult.catch((error) => {
                assert.equal(error, rejection);
                done();
            });
        });

        it("for uncaught error", function(done) {
            let mut = shmutex();

            let rejection = new Error("rejection");

            let qResult = mut.lock(() => { throw rejection; });

            qResult.catch((error) => {
                assert.equal(error, rejection);
                done();
            });
        });
    });
});