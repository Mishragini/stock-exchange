import { Router } from "express";
import { RedisManager } from "../redisManager";

export const balancesRouter = Router();

balancesRouter.get("/", async(req, res) =>{
    const response = await RedisManager.getInstance().sendAndAwait({
        type:"GET_BALANCE",
        data:{
            userId: req.query.userId as string
        }
    })
    res.json(response.payload)
})

balancesRouter.post("/onramp", async(req,res) =>{
    const {userId, amount} = req.body;

    const response = await RedisManager.getInstance().sendAndAwait({
        type:"ON_RAMP",
        data:{
            userId,
            amount
        }
    })

    res.json(response.payload)
})