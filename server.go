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

type SimInstance struct {
	sim_time       time.Duration
	err_rate       float64
	req_status     string
	timeout_limit  time.Duration
	status_updated chan struct{}
	lock           sync.Mutex
}

func newSim(sim_time time.Duration, err_rate float64, timeout_limit time.Duration) *SimInstance {

	sim := &SimInstance{
		sim_time:       sim_time,
		err_rate:       err_rate,
		req_status:     "pending",
		timeout_limit:  timeout_limit,
		status_updated: make(chan struct{}, 1),
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

// short polling, simply return current status
func (s *SimInstance) shortPoll(w http.ResponseWriter, r *http.Request) {
	s.lock.Lock()
	defer s.lock.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"result": s.req_status})

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
	}

	log.Printf("\nServer running port %s\nMethod: %s", *port, *polling_method)
	if err := http.ListenAndServe(*port, nil); err != nil {
		log.Fatalf("Server Error: %v", err)
	}

}
