package main

import (
	"encoding/json"
	"flag"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

// =========================== Simulation Instance ===========================

type SimInstance struct {
	sim_time       time.Duration
	err_rate       float64
	req_status     string
	timeout_limit  time.Duration
	status_updated chan struct{}
	lock           sync.Mutex
	server_wait    time.Duration
}

func newSim(sim_time time.Duration, err_rate float64, timeout_limit time.Duration) *SimInstance {
	return &SimInstance{
		sim_time:       sim_time,
		err_rate:       err_rate,
		req_status:     "init",
		timeout_limit:  timeout_limit,
		status_updated: make(chan struct{}, 1),
	}
}

func (s *SimInstance) resetSimulation(sim_time time.Duration, err_rate float64, server_wait time.Duration) {
	s.lock.Lock()
	if s.req_status == "pending" {
		statusChan := s.status_updated
		s.lock.Unlock()

		<-statusChan
		s.lock.Lock()
	}

	s.sim_time = sim_time
	s.err_rate = err_rate
	s.server_wait = server_wait
	s.req_status = "pending"
	s.status_updated = make(chan struct{}, 1)
	s.lock.Unlock()

	s.runSim()
}

func (s *SimInstance) runSim() {
	time.AfterFunc(s.sim_time, func() {
		s.lock.Lock()
		defer s.lock.Unlock()

		if s.req_status == "pending" {
			rand_float := rand.Float64()
			if rand_float < s.err_rate {
				s.req_status = "error"
			} else {
				s.req_status = "completed"
			}
		}
		close(s.status_updated)
	})
}

// =========================== HTTP Handlers ===========================

func shortPollHandler(sim *SimInstance) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(sim.server_wait)
		sim.lock.Lock()
		defer sim.lock.Unlock()

		w.Header().Set("Content-Type", "application/json")
		jsonResponse(w, map[string]string{"result": sim.req_status})
	}
}

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
			time.Duration(getOrDefault(req.SimTime, 5))*time.Second,
			getOrDefault(req.ErrRate, 0.0),
			time.Duration(getOrDefault(req.ServerWait, 0))*time.Millisecond,
		)

		jsonResponse(w, map[string]string{"message": "Fields updated successfully"})
	}
}

// =========================== Utility Functions ===========================

func getOrDefault[T any](val *T, def T) T {
	if val != nil {
		return *val
	}
	return def
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// =========================== Server Setup ===========================

func setupServer(sim *SimInstance, port string) *http.Server {
	http.HandleFunc("/status", shortPollHandler(sim))
	http.HandleFunc("/reset", resetHandler(sim))

	return &http.Server{
		Addr:         port,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  15 * time.Second,
	}
}

// =========================== Main Function ===========================

func main() {
	processTime := flag.Duration("process_time", 5*time.Second, "Seconds before response is sent.")
	errorRate := flag.Float64("error_rate", 0.1, "Probability of sending error response.")
	timeoutLimit := flag.Duration("timeout_limit", 30*time.Second, "Seconds before request times out.")

	port := flag.String("port", ":8080", "Server port")

	flag.Parse()

	sim := newSim(*processTime, *errorRate, *timeoutLimit)
	server := setupServer(sim, *port)

	log.Printf("Server running on port %s", *port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server Error: %v", err)
	}
}
