const express = require('express')
const app = express()
const port = 3000
const fs = require('fs')

app.get('/', (req, res) => {
    return res.send('Received a GET HTTP method');
});

app.get(`/:tokenId` + `.json`, (req, res) => {
    fs.readFile(__dirname + '/' + 'sample-nft.json', 'utf8', (err, data) => {
        res.end(data);
    });
});

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
});