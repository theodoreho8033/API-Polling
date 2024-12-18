import { Client, ClientOptions } from '../../Client/src/ClientLibrary';
import { testCasesSuccess, testCasesError, customOptionsTest } from './TestCase';
import { CustomClient, CustomClientOptions } from './CustomClientDemo';
import {createClient, collectMetrics, resetSimInstance, SimConfig} from './TestUtil'


// =========================== Test Case Runners ===========================

// Runs a batch of success test cases
async function runTestsSuccess() {
    const results = [];
    for (const testCase of testCasesSuccess) {
        console.log(`Running Success Test: ${testCase.name}`);
        const client = createClient(testCase.clientOptions);
        const row = await collectMetrics(client, testCase.name, {
            sim_time: testCase.simConfig.sim_time || 0,
            process_time: testCase.processTime * 1000,
        });
        results.push(row);
    }
    return results;
}

// Runs a batch of error test cases
async function runTestsError() {
    const results = [];
    for (const testCase of testCasesError) {
        console.log(`Running Error Test: ${testCase.name}`);
        const client = createClient(testCase.clientOptions);
        await resetSimInstance(testCase.simConfig);
        await client.poll();

        results.push({
            "Error": testCase.name,
            "Client Status": client.polls.status,
            "Error Description": client.polls.poll_error || "No Error",
            "Number of Polls": client.polls.poll_count,
        });
    }
    return results;
}

// Runs custom tests for both default and custom clients
async function runCustomTest() {
    const defClient = createClient({ initial_delay: 3000 });
    const customClient = new CustomClient(customOptionsTest);

    const simConfigs: SimConfig[] = [
        { sim_time: 5, process_time: 5000 },
        { sim_time: 1, process_time: 1000 },
    ];

    const results = [];
    console.log("Running Custom Polling Config Test")
    for (const simConfig of simConfigs) {
        results.push(await collectMetrics(defClient, "Default Client: Delay 3s", simConfig));
        results.push(await collectMetrics(customClient, "Custom Client: Window Polling", simConfig));
    }

    return results;
}

// =========================== Main Function ===========================

async function runAllTests() {
    const successResults = await runTestsSuccess();
    console.log("\n===== Success Test Cases =====");
    console.table(successResults);
    console.log("Table Description: Demonstrating the behavior of different polling configurations.\n");

    const errorResults = await runTestsError();
    console.log("\n===== Error Handling Test Cases =====");
    console.table(errorResults);
    console.log("Table Description: Demonstrating error handling.\n");

    const customResults = await runCustomTest();
    console.log("\n===== Custom Client Test Cases =====");
    console.table(customResults);
    console.log("Table Description: Demonstrating ability to override Client.getNextDelay() for a custom backoff function.");
    console.log("The expected time for a complete status is either 1s or 5s. A custom Client.getNextDelay() allows users to poll in windows.");
    console.log("In this example, since the complete status takes either 1s or 5s, the custom backoff function polls 3 times at 1s before waiting until 5s.")
    console.log("\n\nTesting done!");
}

runAllTests();
