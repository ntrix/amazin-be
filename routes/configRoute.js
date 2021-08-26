import express from "express";
import configControllers from "../controllers/configControllers";
const configRoute = express.Router();

configRoute.get("/paypal", configControllers.getPaypal);

configRoute.get("/google", configControllers.getGoogle);

configRoute.get("/rates", configControllers.getRates);

configRoute.get("/crypto", configControllers.getCrypto);

configRoute.get("/BTCHist", configControllers.getBtcHistory);

export default configRoute;
