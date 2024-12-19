
cd "$(dirname "$0")"

echo building project...
cd ../Client
npm install
npm run build
cd ../Test
npm install 
npm run build

echo "Starting Go server..."
go run ../Backend/server.go &
SERVER_PID=$! 

echo "Sleeping 10s for server to start"
sleep 10


echo "Running test cases..."
npm run test


echo "Stopping Go server..."
kill $SERVER_PID
echo "Done!"
