import { Client, ClientOptions, Polls } from '../../Client/src/ClientLibrary';

// =========================== Custom Client Options ===========================

export interface CustomClientOptions extends ClientOptions {
    window_starts: number[]; // Start times for polling windows
    polls_per_window: number; // Number of polls allowed per window
}

// =========================== Custom Client Class ===========================

export class CustomClient extends Client {
    protected readonly options: CustomClientOptions;

    constructor(options: CustomClientOptions) {
        super(options);
        this.options = options;

        // Set initial delay to the first window start time
        this.options.initial_delay = this.options.window_starts[0];
    }

    protected getNextDelay(poll: Polls): number {
        const { window_starts, polls_per_window, poll_interval } = this.options;

        const numWindows = window_starts.length;
        const curPollCount = this.polls.poll_count;

        const curWindowIdx = Math.floor(curPollCount / polls_per_window);

        // Adjust delay when moving to a new window
        if (
            curPollCount % polls_per_window === 0 &&
            curWindowIdx > 0 &&
            curWindowIdx < numWindows
        ) {
            const curStart = window_starts[curWindowIdx];
            const prevStart = window_starts[curWindowIdx - 1];

            return curStart - prevStart - poll_interval * (polls_per_window - 1);
        }

        // Default delay
        return poll_interval;
    }
}
