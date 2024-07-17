import express from "express"
import { orderRouter } from "./routes/order";
import { balancesRouter } from "./routes/balance";
import { depthRouter } from "./routes/depth";
import { tickerRouter } from "./routes/ticker";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";

const app = express();
app.use(express.json());

app.use('/api/v1/order',orderRouter);
app.use('/api/v1/balance',balancesRouter);
app.use('/api/v1/depth',depthRouter);
app.use('/api/v1/ticker',tickerRouter);
app.use('/api/v1/trades',tradesRouter);
app.use('/api/v1/klines',klineRouter)

app.listen(3000,()=>{
    console.log("Server started listening on port 3000")
})