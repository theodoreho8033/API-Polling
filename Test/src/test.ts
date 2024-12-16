import { Client, ClientOptions } from '../../Client/src/client';

// Define the Client options
const options: ClientOptions = {
    host: 'http://127.0.0.1:8080/status', // Example API endpoint
    poll_interval: 2000, // Poll every 2 seconds
    max_timeout: 10000, // Maximum timeout of 10 seconds
    max_polls: 50, // Allow up to 5 polls
    max_retry: 3, // Retry up to 3 times
    initial_delay: 1000, // Start polling after a 1-second delay
    exp_backoff: 2, // Exponential backoff multiplier
    req_opts: {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    },
};

// Instantiate the Client
const client = new Client(options);

// Call the poll method
(async () => {
    try {
        console.log('Starting polling...');
        await client.poll();
        console.log('Polling completed:', client.polls);
    } catch (error) {
        console.error('An error occurred during polling:', error);
    }
})();
