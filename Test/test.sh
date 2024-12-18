# Start the Go server in the background
npm run build
echo "Starting Go server..."
go run ../Backend/server.go &
SERVER_PID=$! # Save the server process ID

echo "Sleeping 10s for server to start"
# Allow time for the server to start
sleep 10

# Run the test cases
echo "Running test cases..."
npm run test

# Kill the Go server process after tests finish
echo "Stopping Go server..."
kill $SERVER_PID

echo "Done!"