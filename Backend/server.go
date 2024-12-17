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
	sim_time       time.Duration
	start_time     time.Time
	err_rate       float64
	req_status     string
	timeout_limit  time.Duration
	status_updated chan struct{}
	lock           sync.Mutex
	num_reqs       int64
	server_wait    time.Duration
}

func newSim(sim_time time.Duration, err_rate float64, timeout_limit time.Duration) *SimInstance {
	return &SimInstance{
		sim_time:       sim_time,
		err_rate:       err_rate,
		req_status:     "init",
		timeout_limit:  timeout_limit,
		status_updated: make(chan struct{}, 1),
		start_time:     time.Now(),
		num_reqs:       0,
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
			log.Printf("Error rate: %f, Random number: %f", s.err_rate, rand_float)
			if rand_float < s.err_rate {
				s.req_status = "error"
			} else {
				s.req_status = "completed"
			}
		}
		close(s.status_updated)
	})
}

func shortPollHandler(sim *SimInstance) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(sim.server_wait)
		sim.lock.Lock()
		defer sim.lock.Unlock()

		sim.num_reqs++
		w.Header().Set("Content-Type", "application/json")
		jsonResponse(w, map[string]string{"result": sim.req_status})
	}
}

func longPollHandler(sim *SimInstance) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sim.lock.Lock()

		if sim.req_status != "pending" {
			sim.lock.Unlock()
			jsonResponse(w, map[string]string{"result": sim.req_status})
			return
		}

		statusChan := sim.status_updated
		sim.lock.Unlock()

		select {
		case <-statusChan:
		case <-time.After(sim.timeout_limit):
		}

		jsonResponse(w, map[string]string{"result": sim.req_status})
	}
}

func sseHandler(sim *SimInstance) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		sim.lock.Lock()
		initialStatus := sim.req_status
		sim.lock.Unlock()

		fmt.Fprintf(w, "data: {\"result\": \"%s\"}\n\n", initialStatus)
		flusher.Flush()

		if initialStatus != "pending" {
			return
		}

		statusChan := sim.status_updated
		select {
		case <-statusChan:
			sim.lock.Lock()
			newStatus := sim.req_status
			sim.lock.Unlock()
			fmt.Fprintf(w, "data: {\"result\": \"%s\"}\n\n", newStatus)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
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
			getOrDefault(req.ErrRate, 0.1),
			time.Duration(getOrDefault(req.ServerWait, 0))*time.Millisecond,
		)

		jsonResponse(w, map[string]string{"message": "Fields updated successfully"})
	}
}

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

func setupServer(sim *SimInstance, pollingMethod string, port string) *http.Server {
	switch pollingMethod {
	case "short_polling":
		http.HandleFunc("/status", shortPollHandler(sim))
	case "long_polling":
		http.HandleFunc("/status", longPollHandler(sim))
	case "sse":
		http.HandleFunc("/status", sseHandler(sim))
	default:
		log.Fatalf("Invalid polling method: %s", pollingMethod)
	}

	http.HandleFunc("/reset", resetHandler(sim))

	return &http.Server{
		Addr:         port,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  15 * time.Second,
	}
}

func main() {
	processTime := flag.Duration("process_time", 5*time.Second, "Seconds before response is sent.")
	errorRate := flag.Float64("error_rate", 0.1, "Probability of sending error response.")
	timeoutLimit := flag.Duration("timeout_limit", 30*time.Second, "Seconds before request times out.")
	pollingMethod := flag.String("polling_method", "short_polling", "Polling method: short_polling, long_polling, sse.")
	port := flag.String("port", ":8080", "Server port")

	flag.Parse()

	sim := newSim(*processTime, *errorRate, *timeoutLimit)

	server := setupServer(sim, *pollingMethod, *port)

	log.Printf("Server running on port %s using method: %s", *port, *pollingMethod)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server Error: %v", err)
	}
}
