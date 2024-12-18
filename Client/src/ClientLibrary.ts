import fetch, { RequestInit } from 'node-fetch';

// configurable options
export interface ClientOptions {
    host: string;           // status request url 
    poll_interval: number;  // seconds between polls (ms)
    max_polls: number;      // maximum number of pulls per try
    max_trys: number;       // maximum number of trys
    initial_delay: number;  // delay before polling begins (ms)
    exp_backoff?: number;   // exponential base for backoff function
    req_opts?: RequestInit; // option for adding request options such as headers to status request
    timeout_limit: number;  // client timeout limit per request (ms)
}


// polling cycle data. used to keep track of polls 
export interface Polls {
    res: string | null;     // response body of most recent poll
    poll_count: number;     // total number successful polls
    retry_count: number;    // number of retrys 
    total_time: number;     // total time of polling (ms)
    status: string;         // status of most recent poll (pending, error, complete)
    poll_error?: string;    // error message of most recent poll 
}


const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));


// main library class. instantiated with a ClientOptions interface
export class Client {
    protected readonly options: ClientOptions;
    polls!: Polls;

    constructor(options: ClientOptions) {
        this.options = options;
        this.resetPolls();
    }
// initial poll values
    private resetPolls(): void {
        this.polls = {
            res: null,
            poll_count: 0,
            retry_count: -1,
            total_time: 0,
            status: 'pending',
        };
    }

    // get next delay in polling cycle
    protected getNextDelay(): number {
        const { poll_interval, exp_backoff } = this.options;
        // if a exp_backoff is provided, return delay with expoential backoff. itherwise, just return poll_interval 
        return exp_backoff
            ? poll_interval * Math.pow(exp_backoff, this.polls.poll_count)
            : poll_interval;
    }

    // checks resposne body if status is pending
    protected isPending(res: any): boolean {
        return res.result === 'pending';
    }

    // checks response body if status is error
    protected isError(res: any): boolean {
        return res.result === 'error';
    }

    // runtime error handler for poll() function
    private handleRuntimeError(error: any): void {
        if (error.name === 'AbortError') {
            this.polls.poll_error = `Request timeout limit reached: ${this.options.timeout_limit}ms`;
        } else {
            this.polls.poll_error = `Error: ${error.message || String(error)}`;
        }
        this.polls.status = 'error';
    }

    // update polls fields according to status resposne body
    private handleResponseBody(body: any): void {
        if (this.isError(body)) {
            this.polls.status = 'error';
            this.polls.poll_error = 'Error: Response marked as error';
        } else if (this.isPending(body)) {
            this.polls.poll_count++;
        } else {
            this.polls.poll_count++;
            this.polls.status = 'complete';
        }
    }

    // helper function for sending status request
    protected async fetchResponse(signal: AbortSignal): Promise<any> {
        const response = await fetch(this.options.host, { ...this.options.req_opts, signal });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status} - ${response.statusText}`);
        }

        return response.json();
    }

    // polls status, updates polls, handles errors
    private async sendPoll(controller: AbortController, signal: AbortSignal): Promise<void> {
        
        // timeout when client timeout_limit reached
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout_limit);

        try {

            // make status request and update Polls data
            const body = await this.fetchResponse(signal);
            this.handleResponseBody(body);

            // wait before polling again. only nessecary if status is still pending
            if (this.polls.status === 'pending') {
                await sleep(this.getNextDelay());
            }
        } catch (error) {
            this.handleRuntimeError(error);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // begins polling
    async poll(): Promise<void> {
        
        // reset polls data and set up request timeout controller
        this.resetPolls();
        const startTime = Date.now();
        const controller = new AbortController();
        const signal = controller.signal;

        // retry polling up to max_trys times
        while (this.polls.retry_count < this.options.max_trys && this.polls.status !== 'complete') {
            this.polls.retry_count++;
            await sleep(this.options.initial_delay);
            let cur_poll_count = 0;

            // poll while poll count of current try (cur_poll_count) is less than max_polls
            while (cur_poll_count < this.options.max_polls && this.polls.status === 'pending') {
                await this.sendPoll(controller, signal);
                cur_poll_count++;
            }
        }

        // if status is still pending, polling limit reached
        if (this.polls.status === 'pending') {
            this.polls.status = 'error';
            this.polls.poll_error = 'Error: Max polling limit reached';
        }

        this.polls.total_time = Date.now() - startTime;
    }
}
