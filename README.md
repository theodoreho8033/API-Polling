# API-Polling
A TypeScript library for configurable periodic status polling.

## Overview 
This project is a polling library used for polling a status from a provided API endpoint using Fetch. It supports polling configurations such as intial delay, polling interval, and exponential backoff. It also supports configuration for custom, user-provided backoff functions. 

## Key Features 

- Configurable Polling: Supprot for polling intervals, retries on error, polling limit, and backoff strategies.
- Customization: Easily integrate custom backoff functions.
- Error Handling: Detects server errors, timeouts, polling and retry limits.
- Metric Collection: Keeps track of poll count and polling time to optimize polling paramaters. 

## Quick Start
### Running Test Cases
After cloning the repository, run the sh file ./Test/test.sh to test the library. 

**ENSURE NODE VERSION 22 AND GO ARE INSTALLED BEFORE RUNNING TEST SCRIPT

### Implementing to your application
```typescript
export class MyClient extends Client {
    
    //configure pending status: polling continues if server response body is {"result": "pending"} 
    override isPending(res: any): boolean {
        return res.result === 'pending';
    }

    //configure error status: polling status is error if server response body is {"result": "error"}
    override isError(res: any): boolean {
        return res.result === 'error';
    }

    //polling will be terminate successfully with a complete status if isPending() and isError() is false.
    //polling will attempt to retry if isError() is false. If no retries left, terminates with error status.

}
const options: ClientOptions = {
        host: 'insert url here',    //endpoint url
        poll_interval: 100,         //polling interval is 100ms
        max_polls: 600,             //number of polls per try
        max_retry: 0,               //number of retries on error
        initial_delay: 0,           //initial delay before sending first polling request
        timeout_limit: 50 * 1000,   // each status request timesout after 50 seconds
        req_opts: {                 // configure fetch Request.init 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
    };

const client = new MyClient(options) 

(async () => {
    await client.poll();
    console.log(client.polls);
})();
```

## Specifications
### Client Options 
| Option           | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| `host`          | string  | Server endpoint URL.                             |
| `poll_interval` | number  | Delay between polls in milliseconds.             |
| `max_polls`     | number  | Maximum number of polls per retry.               |
| `max_retry`     | number  | Maximum retry attempts.                          |
| `initial_delay` | number  | Initial delay before starting polling in milliseconds.           |
| `timeout_limit` | number  | client timeout limit per request (ms).                 |
| `exp_backoff`   | number \| null | Exponential backoff multiplier.                  |
| `req_opts`   | Request.Init  | Fetch request options.                 |

### Polls

| Field          | Type            | Description                          |
|-----------------|-----------------|--------------------------------------|
| `res`          | string \| null  | Response data from the last polling result. |
| `poll_count`   | number          | Total number of polls performed.     |
| `retry_count`  | number          | Number of retry attempts made.       |
| `total_time`   | number          | Total time taken for polling (ms).   |
| `status`       | string          | Current status of the polling process (`pending`, `complete`, or `error`). |
| `poll_error`   | string \| undefined | Description of any error encountered during polling. |


### Configurable Client functions

| Name          | Param Type          | Return Type                          | Desc|
|-----------------|-----------------|--------------------------------------|---|
| Client.isPending()         |any| Bool| Return True if server returns pending status in response body.|
| Client.isError()         | any| Bool| Return True if server returns error status in response body|
| Client.getNexDelay()         | Polls| number| Returns delay of next poll in ms|
## Backoff Functionality 

### Default Backoff

If exp_backoff is not null, the polling will calculate the next delay as:

`next_delay = poll_interval × (exp_backoff) ^ poll_count`

### Customizeable Backoff
A user can create their own backoff function by overriding the Client.getNextDelay() function.

To implement a custom client with linear backoff:  `next_delay = poll_interval × poll_count`

```typescript
export class CustomClient extends Client {

    override getNextDelay(poll: Polls): number {
        return poll.poll_interval * poll.poll_count
    }
}
```

Also see ./Test/src/CustomClientDemo for an example of a windowed polling implementation. 