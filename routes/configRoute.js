import express from "express";
import axios from "axios";
const configRoute = express.Router();
const cached = {
  rates: null,
  timestamp: 0,
};

configRoute.get("/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sb");
});

configRoute.get("/google", (req, res) => {
  res.send(process.env.GOOGLE_API_KEY || "");
});

configRoute.get("/rates", (req, res) => {
  if (cached.timestamp && Date.now() - cached.timestamp < 1000 * 60 * 60 * 4) {
    res.send({ data: cached });
    return;
  }
  axios
    .get(
      `http://api.exchangeratesapi.io/v1/latest?access_key=${process.env.RATES_API_KEY}`,
      { mode: "cors" }
    )
    .then((response) => {
      cached.rates = response.data.rates;
      cached.timestamp = response.data.timestamp;
      res.send({ data: cached });
    })
    .catch((error) => res.status(500).send({ message: error }));
});

configRoute.get("/crypto", (req, res) => {
  axios
    .get(`https://api-pub.bitfinex.com/v2/tickers?symbols=ALL`, {
      mode: "cors",
    })
    .then((response) => res.send(response.data))
    .catch((error) => res.status(500).send({ message: error }));
});

configRoute.get("/BTCHist", (req, res) => {
  axios
    .get(
      `https://api-pub.bitfinex.com/v2/candles/trade:1D:tBTCUSD/hist?limit=${req.query.count}`,
      { mode: "cors" }
    )
    .then((response) => res.send(response.data))
    .catch((error) => res.status(404).send({ message: error }));
});

export default configRoute;
