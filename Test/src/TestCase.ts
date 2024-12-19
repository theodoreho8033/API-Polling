import { TestCase } from "./TestUtil";

// File for storing test cases

// =========================== Success Test Cases ===========================

export const testCasesSuccess: TestCase[] = [
    {
        name: "Default Config",
        clientOptions: {},
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Initial Delay 800ms",
        clientOptions: { initial_delay: 800 },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Exponential Backoff",
        clientOptions: { exp_backoff: 2 },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Exponential Backoff + Delay 800ms",
        clientOptions: { exp_backoff: 2, initial_delay: 800 },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
];

// =========================== Error Test Cases ===========================

export const testCasesError: TestCase[] = [
    {
        name: "No Error",
        clientOptions: {},
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Invalid Route",
        clientOptions: { host: "http://127.0.0.1:8080/noroute" },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Max Poll Limit Reached",
        clientOptions: { max_polls: 1 },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Server Timeout",
        clientOptions: { timeout_limit: 20000 },
        sim_config: { sim_time: 1000, err_rate: 0.0, server_wait: 7000 },
    },
    {
        name: "{\"result\":\"error\"}",
        clientOptions: {},
        sim_config: { sim_time: 1000, err_rate: 1.0 },
    },
    {
        name: "Client Timeout",
        clientOptions: { timeout_limit: 20 },
        sim_config: { sim_time: 1000, err_rate: 0.0, server_wait: 500 },
    },
];

// =========================== Custom Options Test ===========================

export const testCasesCustomClient: TestCase[] = [
    {
        name: "Default Delay 600ms",
        clientOptions: { initial_delay: 600 },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Custom: Window Polling",
        clientOptions: { window_starts: [200, 1000], polls_per_window: 3 },
        sim_config: { sim_time: 1000, err_rate: 0.0 },
    },
    {
        name: "Default Delay 600ms",
        clientOptions: { initial_delay: 600 },
        sim_config: { sim_time: 200, err_rate: 0.0 },
    },
    {
        name: "Custom: Window Polling",
        clientOptions: { window_starts: [200, 1000], polls_per_window: 3 },
        sim_config: { sim_time: 200, err_rate: 0.0 },
    },
];
