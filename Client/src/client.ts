
import {Response} from 'node-fetch';

export interface ClientOptions{
    host: string            
    poll_interval: number 
    max_timeout: number 
    max_polls: number 
    max_retry: number 
    initial_delay: number 
    exp_backoff: number

}

export interface PollInstance{
    res: Response 
    poll_count: number 
    retry_count: number 
    total_time: number 
    status: string 
}

export class Client{
    protected readonly options: ClientOptions;
    //instance: PollInstance

    constructor(options: ClientOptions){
        this.options = options
       
    }


}