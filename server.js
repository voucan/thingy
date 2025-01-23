const express = require('express');
const fetch = require('node-fetch');
const morgan = require('morgan');

const app = express();
const ORIGIN = 'https://voucan-us4.github.io';
const CACHE_TTL = 86400 * 1000;
const cache = new Map();

app.use(morgan('tiny'));

const isCacheValid = (cacheEntry) => {
  return cacheEntry && (Date.now() - cacheEntry.timestamp < CACHE_TTL);
};

app.use(async (req, res) => {
  const originUrl = `${ORIGIN}${req.path}`;
  console.log(`Fetching URL: ${originUrl}`);

  const cachedResponse = cache.get(req.url);
  if (isCacheValid(cachedResponse)) {
    console.log('Cache hit');
    res.setHeader('Cache-Control', `max-age=${CACHE_TTL / 1000}`);
    return res.send(cachedResponse.data);
  }

  console.log('Cache miss, fetching from origin');
  try {
    const originResponse = await fetch(originUrl, {
      method: req.method,
      headers: req.headers,
    });

    if (!originResponse.ok) {
      console.error(`Fetch failed: ${originResponse.status} ${originResponse.statusText}`);
      return res.status(originResponse.status).send('404 Not Found: Check the URL or reload the page.');
    }

    const responseBody = await originResponse.text();

    cache.set(req.url, {
      data: responseBody,
      timestamp: Date.now(),
    });

    res.setHeader('Cache-Control', `max-age=${CACHE_TTL / 1000}`);
    res.send(responseBody);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).send('Internal Server Error: Unable to fetch the resource.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
