
import fetch, {Request,  Response, RequestInit} from 'node-fetch';

export interface ClientOptions{
    host: string            
    poll_interval: number 
    max_polls: number 
    max_retry: number 
    initial_delay: number 
    exp_backoff?: number
    req_opts?: RequestInit
    timeout_limit: number
  
    

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
    private resetPolls(){
        this.polls = {
            res: null,
            poll_count: 0, 
            retry_count: -1,
            total_time: 0,
            status: "pending",
            
        } 
    }
    
    protected isPending(res: any): boolean{
        return res.result == "pending"
    }

    protected isError(res: any): boolean{
        return res.result == "error"
    }


    protected getNextDelay(poll: Polls): number{
        if (this.options.exp_backoff != null){
            return this.options.poll_interval * this.options.exp_backoff ** poll.poll_count  
        }else{
            return this.options.poll_interval
        }
        
    }


    async poll(): Promise<void> {
        this.resetPolls()
        const start_time = Date.now()
        while (this.polls.retry_count < this.options.max_retry && this.polls.status !== 'complete') {
            this.polls.retry_count += 1;
            let cur_poll_count = 0;
            await sleep(this.options.initial_delay);
    
            while (cur_poll_count < this.options.max_polls && this.polls.status == 'pending') {
                const controller = new AbortController();
                const signal = controller.signal;
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    }, this.options.timeout_limit);
                try {
                    
                    const response = await fetch(this.options.host, { ...this.options.req_opts, signal});
                    clearTimeout(timeoutId);
                    
    
                    if (!response.ok){
                        this.polls.poll_error = `Error: Server Response - ${response.status} - ${response.statusText}`;
                        this.polls.status = 'error'
                        break
                    }
                    const body = await response.json();
                    this.polls.res = JSON.stringify(body);
                    if (this.isError(body)) {
                        
                        this.polls.status = "error";
                        this.polls.poll_error = "Error: Client.isError() condition met on response body"
                        break
                    } else if (this.isPending(body)) {
                        cur_poll_count += 1;
                        this.polls.poll_count +=1;
                        await sleep(this.getNextDelay(this.polls));
                    } else {
                        this.polls.poll_error = "Success"
                        this.polls.status = 'complete';
                    }
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        this.polls.poll_error = `Error: Request timeout limit reached: ${this.options.timeout_limit}ms`;
                    } else if (error instanceof Error) {
                        this.polls.poll_error = `Error: ${error.message}`;
                    } else {
                        this.polls.poll_error = `Client Error: ${String(error)}`;
                    }
                    this.polls.status = "error";
                }finally{
                    clearTimeout(timeoutId);  
                }
            }
            
            
        }

        if (this.polls.retry_count == this.options.max_retry  && this.polls.status == 'pending'){
            this.polls.status = 'error'
            this.polls.poll_error = 'Error: Max polling limit reached.'
        }
        this.polls.total_time = Date.now() - start_time
    }

}