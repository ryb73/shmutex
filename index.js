"use strict";

function Shmutex() {
    let queue = [],
        exclusiveInProgress = false,
        sharedInProgress = 0;

    function lock(func, exclusive) {
        queue.push({
            func,
            exclusive: !!exclusive
        })

        flush();
    }
    this.lock = lock;

    function flush() {
        if(exclusiveInProgress)
            return;

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
            sharedOnly = true;
        }
    }

    function startJob(job) {
        let result = job.func();
        if(result && result.then) {
            result.done(completeJob.bind(null, job));
        } else {
            completeJob(job);
        }
    }

    function completeJob(job) {
        if(job.exclusive)
            exclusiveInProgress = false;
        else
            --sharedInProgress;

        flush();
    }

    // Aliases
    this.read = (func) => {
        return lock(func);
    };

    this.write = (func) => {
        return lock(func, true);
    };
}

module.exports = () => new Shmutex();