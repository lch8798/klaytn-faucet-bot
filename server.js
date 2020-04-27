const https = require('https');
const express = require('express');
const fs = require('fs');

const config = require('./config.json');

const app = express();

const port = config.port;

// client-side react render
app.use(express.static(__dirname + '/build'));

app.listen(port, () => {
    console.log(`run server port: ${port}`);
});

if (config.https) {
    const httpsPort = config.httpsPort;
    const httpsKeys = {
        key: fs.readFileSync('/../../../../etc/letsencrypt/live/leechan.kr/privkey.pem', 'utf8'),
        cert: fs.readFileSync('/../../../../etc/letsencrypt/live/leechan.kr/cert.pem', 'utf8'),
        ca: fs.readFileSync('/../../../../etc/letsencrypt/live/leechan.kr/chain.pem', 'utf8'),
    };

    const server = https.createServer(httpsKeys, app);

    server.listen(httpsPort, () => {
        console.log(`run server port: ${httpsPort}`);
    });
}
