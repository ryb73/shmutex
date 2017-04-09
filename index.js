"use strict";

const q = require("q");

function Shmutex() {
    let queue = [],
        exclusiveInProgress = false,
        sharedInProgress = 0;

    function lock(func, exclusive) {
        let deferred = q.defer();

        queue.push({
            func,
            exclusive: !!exclusive,
            deferred
        });

        flush();

        return deferred.promise;
    }
    this.lock = lock;

    function flush() {
        if(exclusiveInProgress)
            return;

        // If there are no running jobs, then prefer the first one that was queued.
        // However, if there are shared jobs running, we can't start an exclusive one
        // but CAN store more shared ones
        let sharedOnly = sharedInProgress > 0;
        let i = -1;
        while(++i < queue.length) {
            let nextJob = queue[i];
            if(sharedOnly && nextJob.exclusive)
                continue;

            queue.splice(i, 1);
            --i;

            if(nextJob.exclusive) {
                exclusiveInProgress = true;
                startJob(nextJob);
                return;
            }

            ++sharedInProgress;
            startJob(nextJob);
            sharedOnly = true; // Just started a shared job, so can't start an exclusive one
        }
    }

    function startJob(job) {
        let result;
        try {
            result = job.func();
        } catch(error) {
            completeJob(job, error, true);
            return;
        }

        // If a thenable was returned, wait for it to resolve. Otherwise, assume job is done
        if(result && result.then) {
            result.done(
                (result) => completeJob(job, result),
                (error) => completeJob(job, error, true)
            );
        } else {
            completeJob(job, result);
        }
    }

    function completeJob(job, result, rejected) {
        if(job.exclusive)
            exclusiveInProgress = false;
        else
            --sharedInProgress;

        if(rejected)
            job.deferred.reject(result);
        else
            job.deferred.resolve(result);

        flush();
    }

    // Aliases
    this.read = (func) => lock(func);
    this.write = (func) => lock(func, true);
}

module.exports = () => new Shmutex();