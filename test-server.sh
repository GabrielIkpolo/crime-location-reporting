#!/bin/bash
pkill -f "next dev" || true
npx next dev > server.log 2>&1 &
sleep 15
echo "Checking port 3000..."
nc -zv 127.0.0.1 3000
echo "Calling API..."
curl -v http://127.0.0.1:3000/api/reports
curl -v http://localhost:3000/api/reports/admin
