import { Client, ClientOptions } from '../../Client/src/client';
import { testCasesSuccess, testCasesError } from './testcases'; 
import {CustomClient, CustomClientOptions} from './customclient';
interface EditRequest {
    sim_time?: number; 
    err_rate?: number; 
}


function createClientOptions(overrides = {}): ClientOptions {
    const defaultOptions: ClientOptions = {
        host: 'http://127.0.0.1:8080/status',
        poll_interval: 100,
        max_polls: 600,
        max_retry: 0,
        initial_delay: 0,
        timeout_limit: 50 * 1000,
        req_opts: {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        },
    };
    return { ...defaultOptions, ...overrides };
}

function createClient(overrides = {}): Client {
    const options = createClientOptions(overrides);
    return new Client(options);
}

async function resetSimInstance(requestData: EditRequest): Promise<void> {
    try {
        const response = await fetch(`http://127.0.0.1:8080/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error resetting simulation instance:', error);
    }
}


function getRowSuccess(client: Client, test_name: string, process_time: number) {
    return {
        "Test Name": test_name,
        "Status": client.polls.status,
        "Polling Time (ms)": client.polls.total_time,
        "Process Time (ms)": process_time * 1000,
        "Polling - Process Time (ms)": client.polls.total_time - process_time * 1000,
        "Number of Polls": client.polls.poll_count,
       
    };
}

async function runSingleTestSuccess(testName: string, clientOptions: {}, simConfig: EditRequest, processTime: number) {
    await resetSimInstance(simConfig);
    const client = createClient(clientOptions);
    await client.poll();
    return getRowSuccess(client, testName, processTime);
}

async function runTestsSuccess() {
    const results = [];
    for (const testCase of testCasesSuccess) {
        console.log(`Running Success Test: ${testCase.name}`);
        const row = await runSingleTestSuccess(
            testCase.name, 
            testCase.clientOptions, 
            testCase.simConfig, 
            testCase.processTime
        );
        results.push(row);
    }
    console.table(results);
}


function getRowError(client: Client, test_name: string) {
    return {
        "Test Name": test_name,
        "Status": client.polls.status,
        "Error Status": client.polls.poll_error || "No Error",
        "Number of Polls": client.polls.poll_count,
        "Number of Retries": client.polls.retry_count,
        
    };
}

async function runSingleTestError(testName: string, clientOptions: {}, simConfig: EditRequest) {
    await resetSimInstance(simConfig);
    const client = createClient(clientOptions);
    await client.poll();
    return getRowError(client, testName);
}

async function runTestsError() {
    const results = [];
    for (const testCase of testCasesError) {
        console.log(`Running Error Test: ${testCase.name}`);
        const row = await runSingleTestError(
            testCase.name, 
            testCase.clientOptions, 
            testCase.simConfig
        );
        results.push(row);
    }
    console.table(results);
}

// ===== Run Both Test Types =====
async function runAllTests() {
    console.log("\n===== Running Success Test Cases =====");
    await runTestsSuccess();

    console.log("\n===== Running Error Test Cases =====");
    await runTestsError();
}

runAllTests();
