
import fetch, {Request,  Response, RequestInit} from 'node-fetch';

export interface ClientOptions{
    host: string            
    poll_interval: number 
    max_timeout: number 
    max_polls: number 
    max_retry: number 
    initial_delay: number 
    exp_backoff?: number
    req_opts?: RequestInit
  
    

}

export interface Polls{
    res: string | null
    poll_count: number
    retry_count: number 
    total_time: number 
    status: string 
    poll_error?: string
}


function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
export class Client{
    protected readonly options: ClientOptions;
    polls: Polls 
   
    constructor(options: ClientOptions){
        this.options = options
        this.polls = {
            res: null,
            poll_count: 1, 
            retry_count: -1,
            total_time: 0,
            status: "pending",
            
        }
        
       
    }
    //rename to isError/isPending
    protected isPending(res: any): boolean{
        return res.result == "pending"
    }

    protected isError(res: any): boolean{
        return res.result == "error"
    }


    protected getNextDelay(poll: Polls): number{
        if (this.options.exp_backoff != null){
            return this.options.exp_backoff ** poll.poll_count  
        }else{
            return this.options.poll_interval
        }
        
    }


    async poll(): Promise<void> {
        const start_time = Date.now()
        while (this.polls.retry_count < this.options.max_retry && this.polls.status !== 'complete') {
            this.polls.retry_count += 1;
            var cur_poll_count = 0;
            await sleep(this.options.initial_delay);
    
            while (cur_poll_count < this.options.max_polls && this.polls.status === 'pending') {
                try {
                    const response = await fetch(this.options.host, this.options.req_opts);
                    const body = await response.json();
    
                    this.polls.res = JSON.stringify(body);
    
                    if (this.isError(body) || !response.ok) {
                        this.polls.status = "error";
                        this.polls.poll_error = `Error: ${response.status} - ${response.statusText}`;
                    } else if (this.isPending(body)) {
                        cur_poll_count += 1;
                        this.polls.poll_count +=1;
                        await sleep(this.getNextDelay(this.polls));
                    } else {
                        
                        this.polls.status = 'complete';
                    }
                } catch (error) {
                    this.polls.poll_error = error instanceof Error ? error.message : String(error);
                    this.polls.status = "error";
                    
                    this.polls.total_time = Date.now() - start_time
                    
                }
            }
            
            
        }
        this.polls.total_time = Date.now() - start_time
    }

}