import { Router } from "express";
import { RedisManager } from "../redisManager";

export const orderRouter = Router();

orderRouter.post("/",async (req, res) => {
    const {market, price, quantity, side, userId} = req.body;
    console.log(req.body);
    const response = await RedisManager.getInstance().subscribeAndPushToQueue({
        type: 'CREATE_ORDER',
        data:{
            market, 
            price, 
            quantity, 
            side, 
            userId
        }
    })
    console.log(response)
    res.json({message:"order placed!"});
})