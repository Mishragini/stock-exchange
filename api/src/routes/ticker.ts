import { Router } from "express";
import { RedisManager } from "../redisManager";

export const tickerRouter = Router();

tickerRouter.get("/", async(req,res) => {
    const { symbol } = req.query;

    const response = await RedisManager.getInstance().sendAndAwait({
        type: "GET_TICKER",
        data:{
            market: symbol as string
        }
    })

    res.json(response.payload)
})