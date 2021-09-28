import axios from "axios";
import cacheManager from "cache-manager";
import express from "express";
const configRoute = express.Router();
const memoryCache = cacheManager.caching({
  store: "memory",
  max: 100,
  ttl: 24 * 60 * 60 /*seconds*/,
});
const ttl = 4 * 60 * 60;

const configControllers = {
  getPaypal(req, res) {
    res.send(process.env.PAYPAL_CLIENT_ID || "sb");
  },

  getGoogle(req, res) {
    res.send(process.env.GOOGLE_API_KEY || "");
  },

  getRates(req, res) {
    const key = "rates";

    memoryCache.get(key, function (err, result) {
      if (result) {
        res.send({ data: JSON.parse(result) });
        return;
      }

      axios
        .get(
          `http://api.exchangeratesapi.io/v1/latest?access_key=${process.env.RATES_API_KEY}`
        )
        .then((response) => {
          memoryCache.set(
            key,
            JSON.stringify(response.data),
            { ttl },
            (_err) => {
              if (_err) throw _err;
            }
          );
          res.send({ data: response.data });
        })
        .catch((error) => res.status(500).send({ message: error }));
    });
  },

  getCrypto(req, res) {
    axios
      .get(`https://api-pub.bitfinex.com/v2/tickers?symbols=ALL`, {
        mode: "cors",
      })
      .then((response) => res.send(response.data))
      .catch((error) => res.status(500).send({ message: error }));
  },

  getBtcHistory(req, res) {
    axios
      .get(
        `https://api-pub.bitfinex.com/v2/candles/trade:1D:tBTCUSD/hist?limit=${req.query.count}`,
        { mode: "cors" }
      )
      .then((response) => res.send(response.data))
      .catch((error) => res.status(404).send({ message: error }));
  },
};

export default configControllers;
