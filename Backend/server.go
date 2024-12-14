package main

import (
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
}

func newSim(sim_time time.Duration, err_rate float64, timeout_limit time.Duration) *SimInstance {

	sim := &SimInstance{
		sim_time:       sim_time,
		err_rate:       err_rate,
		req_status:     "pending",
		timeout_limit:  timeout_limit,
		status_updated: make(chan struct{}, 1),
		start_time:     time.Now(),
		num_reqs:       0,
	}

	time.AfterFunc(sim_time, func() { // after simulation time is up, update status
		sim.lock.Lock()
		defer sim.lock.Unlock()

		if sim.req_status == "pending" { // dont change status if status is already changed
			if rand.ExpFloat64() < sim.err_rate {
				sim.req_status = "error"
			} else {
				sim.req_status = "completed"
			}
		}
		close(sim.status_updated)

	})

	return sim

}

//func (s *SimInstance) logRequest(){
//	log.Printf("	Status: %s\n	Runtime:	%")
//}

// short polling, simply return current status
func (s *SimInstance) shortPoll(w http.ResponseWriter, r *http.Request) {
	s.lock.Lock()
	defer s.lock.Unlock()
	s.num_reqs += 1

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "{\"result\" : \"%s\"}", s.req_status)

}

func (s *SimInstance) longPoll(w http.ResponseWriter, r *http.Request) {

	s.lock.Lock()

	if s.req_status != "pending" {
		s.lock.Unlock()
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, "{\"result\" : \"%s\"}", s.req_status)
		return
	}

	status_channel := s.status_updated
	s.lock.Unlock()
	select {
	case <-status_channel:

	case <-time.After(s.timeout_limit):

	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "{\"result\" : \"%s\"}", s.req_status)
}

func (s *SimInstance) SSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	s.lock.Lock()
	initial_status := s.req_status
	s.lock.Unlock()

	// Send the initial result
	fmt.Fprintf(w, "data: {\"result\": \"%s\"}\n\n", initial_status)
	flusher.Flush()

	if initial_status != "pending" {
		return
	}

	// Wait for updates and send them
	statusChan := s.status_updated

	select {
	case <-statusChan:
		// Status updated
		s.lock.Lock()
		new_status := s.req_status
		s.lock.Unlock()
		fmt.Fprintf(w, "data: {\"result\": \"%s\"}\n\n", new_status)
		flusher.Flush()
	case <-r.Context().Done():
		// Client disconnected
		return
	}
}
func main() {

	process_time := flag.Duration("process_time", 10*time.Second, "Number of seconds before response is sent. Default 10.")
	error_rate := flag.Float64("error_rate", 0.1, "Probability of sending error response. Default 0.1")
	timeout_limit := flag.Duration("timeout_limit", 30*time.Second, "Seconds before request times out. For long polling only. Default 30.")
	polling_method := flag.String("polling_method", "short_polling", "Server polling method. One of ['short_polling', 'long_polling', 'sse']")
	port := flag.String("port", ":8080", "Server port")

	flag.Parse()

	sim := newSim(*process_time, *error_rate, *timeout_limit)

	//use correct method dending on server type
	if *polling_method == "short_polling" {
		http.HandleFunc("/status", sim.shortPoll)
	} else if *polling_method == "long_polling" {
		http.HandleFunc("/status", sim.longPoll)
	} else {
		http.HandleFunc("/status", sim.SSE)
	}

	log.Printf("\nServer running port %s\nMethod: %s", *port, *polling_method)
	if err := http.ListenAndServe(*port, nil); err != nil {
		log.Fatalf("Server Error: %v", err)
	}

}
