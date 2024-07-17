import { Router } from "express";
import { RedisManager } from "../redisManager";

export const tradesRouter = Router();

tradesRouter.get("/", async(req, res) => {
    const { market } = req.query;

    const response = await RedisManager.getInstance().sendAndAwait({
        type:"GET_TRADES",
        data:{
            market: market as string
        }
    })

    res.json(response.payload)
})