const express = require('express');
const app = express();

// server config
const port = 3020;

// client-side react render
app.use(express.static(__dirname + '/build'));

// app.use('/api', router);
app.listen(port, () => {
    console.log(`run node server port: ${port}`);
});
