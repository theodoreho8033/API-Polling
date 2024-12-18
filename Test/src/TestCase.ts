import { CustomClientOptions, CustomClient } from "./CustomClientDemo";
import { ClientOptions } from "../../Client/src/ClientLibrary";

// =========================== Success Test Cases ===========================

export const testCasesSuccess = [
    { 
        name: "Default Config", 
        clientOptions: {}, 
        simConfig: { sim_time: 5, err_rate: 0.0 }, 
        processTime: 5,
    },
    { 
        name: "Initial Delay 4s", 
        clientOptions: { initial_delay: 4000 }, 
        simConfig: { sim_time: 5, err_rate: 0.0 }, 
        processTime: 5,
    },
    { 
        name: "Exponential Backoff", 
        clientOptions: { exp_backoff: 2 }, 
        simConfig: { sim_time: 5, err_rate: 0.0 }, 
        processTime: 5,
    },
    { 
        name: "Exponential Backoff + Delay 4s", 
        clientOptions: { exp_backoff: 2, initial_delay: 4000 }, 
        simConfig: { sim_time: 5, err_rate: 0.0 }, 
        processTime: 5,
    },
];

// =========================== Error Test Cases ===========================

export const testCasesError = [
    { 
        name: "No Error", 
        clientOptions: {}, 
        simConfig: { sim_time: 1, err_rate: 0.0 }, 
        processTime: 5,
    },
    { 
        name: "Invalid Route", 
        clientOptions: { host: "http://127.0.0.1:8080/noroute" }, 
        simConfig: { sim_time: 5, err_rate: 0.0 }, 
        processTime: 5,
    },
    { 
        name: "Max Poll Limit Reached", 
        clientOptions: { max_polls: 1 }, 
        simConfig: { sim_time: 5, err_rate: 0.0 }, 
        processTime: 5,
    },
    { 
        name: "Server Timeout", 
        clientOptions: {}, 
        simConfig: { sim_time: 5, err_rate: 0.0, server_wait: 6000 }, 
        processTime: 5,
    },
    { 
        name: "{\"result\":\"error\"}", 
        clientOptions: {}, 
        simConfig: { sim_time: 1, err_rate: 1.0 }, 
        processTime: 5,
    },
    { 
        name: "Client Timeout", 
        clientOptions: { timeout_limit: 100 }, 
        simConfig: { sim_time: 5, server_wait: 3000 }, 
        processTime: 5,
    },
];

// =========================== Custom Options Test ===========================

export const customOptionsTest: CustomClientOptions = {
    host: "http://127.0.0.1:8080/status",
    poll_interval: 100,
    max_polls: 600,
    max_retry: 0,
    initial_delay: 0,
    timeout_limit: 50 * 1000,
    req_opts: {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    },
    window_starts: [1000, 5000],
    polls_per_window: 3,
};
