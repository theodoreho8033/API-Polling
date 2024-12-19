package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

type SimInstance struct {
	sim_time       time.Duration // execution time of simulated process
	err_rate       float64       // probaility of returning {result: error}
	req_status     string        // status of process ('pending', 'error', 'complete')
	status_updated chan struct{} // channel to signal when process finishes pending
	lock           sync.Mutex    //mutex lock
	server_wait    time.Duration //time server takes to send a request. only used for testing client timeouts
}

// initialize SimInstnce with default paramaters
func newSim() *SimInstance {
	return &SimInstance{
		sim_time:       1000,
		err_rate:       0.0,
		req_status:     "init",
		status_updated: make(chan struct{}, 1),
		server_wait:    0,
	}
}

// reset simulation. changes state back to "pending" and sets new SimInstance paramaters
func (sim *SimInstance) resetSimulation(sim_time time.Duration, err_rate float64, server_wait time.Duration) {
	sim.lock.Lock()

	//	if status pending ensure simulation finishes before resetting
	if sim.req_status == "pending" {
		statusChan := sim.status_updated
		sim.lock.Unlock()

		<-statusChan
		sim.lock.Lock()
	}
	//	set SimInstance params and open new channel
	sim.sim_time = sim_time
	sim.err_rate = err_rate
	sim.server_wait = server_wait
	sim.req_status = "pending"
	sim.status_updated = make(chan struct{}, 1)
	sim.lock.Unlock()

	sim.runSim()
}

// after configured simulation time, update status properly
func (sim *SimInstance) runSim() {

	time.AfterFunc(sim.sim_time, func() {
		sim.lock.Lock()
		defer sim.lock.Unlock()

		if sim.req_status == "pending" {

			// error rate implentation
			rand_float := rand.Float64()
			if rand_float < sim.err_rate {
				sim.req_status = "error"
			} else {
				sim.req_status = "completed"
			}
		}
		close(sim.status_updated)
	})
}

// route /status sends {result: pending or error or complete} as response to client
func statusHandler(sim *SimInstance) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(sim.server_wait)
		sim.lock.Lock()
		defer sim.lock.Unlock()

		jsonResponse(w, map[string]string{"result": sim.req_status})
	}
}

// route /reset is used for resetting the SimInstance paramaters. used for reconfiguring server for different tests without needing to restart server
func resetHandler(sim *SimInstance) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Only POST requests are allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			SimTime    *int     `json:"sim_time"`
			ErrRate    *float64 `json:"err_rate"`
			ServerWait *int     `json:"server_wait"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		sim.resetSimulation(
			time.Duration(getOrDefault(req.SimTime, 5))*time.Millisecond,
			getOrDefault(req.ErrRate, 0.0),
			time.Duration(getOrDefault(req.ServerWait, 0))*time.Millisecond,
		)

		jsonResponse(w, map[string]string{"message": "Fields updated successfully"})
	}
}

// helper function for adding default values
func getOrDefault[T any](val *T, def T) T {
	if val != nil {
		return *val
	}
	return def
}

// helper function for writing json data and sends response
func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func setupServer(sim *SimInstance, port string) *http.Server {
	http.HandleFunc("/status", statusHandler(sim))
	http.HandleFunc("/reset", resetHandler(sim))

	return &http.Server{
		Addr:         port,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  15 * time.Second,
	}
}

func main() {

	// option to set port
	port := flag.String("port", "8080", "Server port")
	host := fmt.Sprintf("127.0.0.1:%s", *port)
	sim := newSim()
	server := setupServer(sim, host)

	log.Printf("Server running on port %s", *port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server Error: %v", err)
	}
}
