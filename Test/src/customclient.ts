import { Client, ClientOptions, Polls } from '../../Client/src/client';



export interface CustomClientOptions extends ClientOptions {
    window_starts: number[]; 
    polls_per_window: number;    
}


export class CustomClient extends Client {
    protected readonly options: CustomClientOptions;

    constructor(options: CustomClientOptions) {
        super(options);
        this.options = options;
    }

    protected getNextDelay(poll: Polls): number {
       
        
        
        const num_windows = this.options.window_starts.length
        const polls_per_window = this.options.polls_per_window
        const cur_poll_count = this.polls.poll_count 
        const cur_window_idx = Math.floor(cur_poll_count / polls_per_window)
        if (cur_poll_count % polls_per_window == 0  && cur_window_idx < num_windows && cur_window_idx > 0){
            const cur_start = this.options.window_starts[cur_window_idx]
            const prev_start = this.options.window_starts[cur_window_idx - 1]
            return cur_start - prev_start + this.options.poll_interval * polls_per_window
        }else{
            return this.options.poll_interval
        }


    }

}