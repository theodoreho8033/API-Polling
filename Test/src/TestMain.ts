import {  testCasesError, testCasesSuccess, testCasesCustomClient } from './TestCase';
import {createClient, collectMetrics, TestCase, } from './TestUtil'


// runs a list of TestCases and returns test results
async function runTests(cases: TestCase[], type: "success" | "error") {
    const results = [];
    for (const testCase of cases) {
        console.log(`Running ${type === "success" ? "Success" : "Error"} Test: ${testCase.name}`);
        const client = createClient(testCase.clientOptions);
        const row = await collectMetrics(testCase, client, type);
        results.push(row);
    }
    return results;
}


// runs and prints test case data and results
async function runAllTests() {
    const successResults = await runTests(testCasesSuccess, "success");
    console.log("\n===== Success Test Cases =====");
    console.table(successResults);
    console.log("Table Description: Demonstrating the behavior of different polling configurations.\n");

    const errorResults = await runTests(testCasesError, "error");
    console.log("\n===== Error Handling Test Cases =====");
    console.table(errorResults);
    console.log("Table Description: Demonstrating error handling.\n");

    const customResults = await runTests(testCasesCustomClient, "success");
    console.log("\n===== Custom Client Test Cases =====");
    console.table(customResults);
    console.log("Table Description: Demonstrating ability to override Client.getNextDelay() for a custom backoff function.");
    console.log("The expected time for a complete status is either 200ms or 1000ms. A custom Client.getNextDelay() allows users to poll in windows.");
    console.log("In this example, since the complete status takes either 200ms or 100ms, the custom backoff function polls 3 times at 200ms before waiting until 1000ms.")
    console.log("\n\nTesting done!");
}

runAllTests();
