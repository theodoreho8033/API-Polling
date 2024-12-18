import { Client, ClientOptions } from '../../Client/src/ClientLibrary';
import { testCasesSuccess, testCasesError, customOptionsTest } from './TestCase';
import { CustomClient, CustomClientOptions } from './CustomClientDemo';

interface EditRequest {
    sim_time?: number;
    err_rate?: number;
}

export type SimConfig = { sim_time: number; process_time: number };

// =========================== Utility Functions ===========================

// Creates default ClientOptions and applies overrides
export function createClientOptions(overrides = {}): ClientOptions {
    const defaultOptions: ClientOptions = {
        host: 'http://127.0.0.1:8080/status',
        poll_interval: 100,
        max_polls: 600,
        max_retry: 0,
        initial_delay: 0,
        timeout_limit: 50 * 1000,
        req_opts: {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
    };
    return { ...defaultOptions, ...overrides };
}

// Creates a new Client with optional overrides
export function createClient(overrides = {}): Client {
    const options = createClientOptions(overrides);
    return new Client(options);
}

// Resets simulation instance with provided request data
export async function resetSimInstance(requestData: EditRequest): Promise<void> {
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

// Collects metrics for a client after polling
export async function collectMetrics(
    client: Client | CustomClient,
    testName: string,
    simConfig: SimConfig
) {
    await resetSimInstance({ sim_time: simConfig.sim_time });
    await client.poll();

    return {
        "Configuration": testName,
        "Status": client.polls.status,
        "Poll Count": client.polls.poll_count,
        "Polling Time (ms)": client.polls.total_time,
        "Server Process Time (ms)": simConfig.process_time,
        "Polling Time - Process Time (ms)": client.polls.total_time - simConfig.process_time,
    };
}