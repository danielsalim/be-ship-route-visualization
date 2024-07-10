const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const conversionRoutes = require('./src/routes/conversionRoute');
const routePlanningRoutes = require('./src/routes/routePlanningRoute');

const app = express()
const port = 3000;

app.use(bodyParser.json());

app.use('/api', conversionRoutes);
app.use('/api', routePlanningRoutes);

const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// WebSocket setup for AIS data
const wss = new WebSocket.Server({ server });
const aisSocket = new WebSocket("wss://stream.aisstream.io/v0/stream");

aisSocket.onopen = function (_) {
    let subscriptionMessage = {
        Apikey: "56e094eeace3feec04601e5a5652fb4bcd808d81",
        BoundingBoxes: [[[-122.54808807373047, 47.23564910888672], [-122.35845184326172, 47.32112503051758]]],
    };
    aisSocket.send(JSON.stringify(subscriptionMessage));
};

aisSocket.onmessage = function (event) {
    let aisMessage = JSON.parse(event.data);
    console.log(aisMessage)
    // Broadcast the AIS message to all connected clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(aisMessage));
        }
    });
};

wss.on('connection', ws => {
    console.log('Client connected to WebSocket');
    ws.on('close', () => console.log('Client disconnected from WebSocket'));
});