const express = require('express');
const bodyParser = require('body-parser');
const { handler: send } = require('./netlify/functions/send.js');
const { handler: hostEmailImage } = require('./netlify/functions/host-email-image.js');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/send', async (req, res) => {
  const result = await send({ httpMethod: 'POST', body: JSON.stringify(req.body) });
  res.status(result.statusCode).set('Content-Type', 'application/json').send(result.body);
});

app.post('/host-email-image', async (req, res) => {
  const result = await hostEmailImage({ httpMethod: 'POST', body: JSON.stringify(req.body) });
  res.status(result.statusCode).set('Content-Type', 'application/json').send(result.body);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
