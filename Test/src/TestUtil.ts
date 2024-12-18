import { Client } from '../../Client/src/ClientLibrary';
import { CustomClient, CustomClientOptions } from './CustomClientDemo';

// server.go server configurations
export interface SimConfig {
    sim_time: number;
    err_rate?: number; 
    server_wait?: number; 
}

// test case data
export interface TestCase {
    name: string;
    clientOptions: Record<string, any>;
    sim_config: SimConfig;
}

// creates options from TestCase clientOptions
function createClientOptions(overrides = {}): CustomClientOptions {
    const defaultOptions: CustomClientOptions = {
        host: 'http://127.0.0.1:8080/status',
        poll_interval: 25,
        max_polls: 600,
        max_trys: 0,
        initial_delay: 0,
        timeout_limit: 50 * 200,
        req_opts: {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
        window_starts: [],
        polls_per_window: 0,
    };
    return { ...defaultOptions, ...overrides };
}

// creates a Client based on options in TestCase clientOptions
export function createClient(overrides = {}): Client | CustomClient{
    const options = createClientOptions(overrides);
    
    return options.polls_per_window > 0
        ? new CustomClient(options)
        : new Client(options);
  
}

// resets server.go configuration by sending POST request with paramaters
export async function resetSimInstance(requestData: SimConfig): Promise<void> {
    try {
        const response = await fetch(`http://127.0.0.1:8080/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error resetting simulation instance:', error);
    }
}

// compiles testing metrics for table 
export async function collectMetrics(testCase: TestCase, client: Client, type: "success" | "error") {
    await resetSimInstance(testCase.sim_config);

    if (type === "success") {
        await client.poll();
        return {
            "Test Name": testCase.name,
            "Status": client.polls.status,
            "Poll Count": client.polls.poll_count,
            "Polling Time (ms)": client.polls.total_time,
            "Server Process Time (ms)": testCase.sim_config.sim_time,
            "Polling Time - Process Time (ms)": client.polls.total_time - testCase.sim_config.sim_time,
        };
    } else if (type === "error") {
        await client.poll();
        return {
            "Error": testCase.name,
            "Client Status": client.polls.status,
            "Error Description": client.polls.poll_error || "No Error",
        };
    }
}