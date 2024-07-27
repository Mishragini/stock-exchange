import fs from "fs";
import { Fill, Order, Orderbook } from "./Orderbook";
import { fromApi } from "../types/fromApi";
import { RedisManager } from "../RedisManager";

export const BASE_CURRENCY = "INR";

interface UserBalance {
    [key: string] : {
        available: number;
        locked: number
    }
}

export class Engine {
    private orderbooks: Orderbook[] = [];
    private balances: Map<string, UserBalance> = new Map();

    constructor() {
        let snapshot = null;
        try{
            if(process.env.WITH_SNAPSHOT){
                snapshot = fs.readFileSync("./snapshot.json")
            }
        } catch(e){
            console.log("No snapshot found");
        }

        if(snapshot) {
            const snapshotContent = JSON.parse(snapshot.toString());
            this.orderbooks = snapshotContent.orderbooks.map((o : any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(snapshotContent.balances)
        }
        
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3)
    }

    saveSnapshot() {
        const snapshotContent = {
            orderbooks: this.orderbooks.map(o => o.getSnapshot()),
            balances: Array.from(this.balances.entries())
        }
        fs.writeFileSync("./snapshot.json", JSON.stringify(snapshotContent));
    }

    process({message, clientId}:{message: fromApi, clientId: string}) {
        switch(message.type) {
            case 'CREATE_ORDER':
                try {
                    const { executedQty, fills, orderId } = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.side, message.data.userId);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills
                        }
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                }
                break;
        }
    }

    createOrder(
        market: string,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    ){
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];

        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, price, quantity)

        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        }

        const { fills, executedQty } = orderbook.addOrder(order);
        this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);
        this.createDbTrades(fills, market,userId);
        this.updateDbOrders(order, executedQty, fills, market);
        this.publishWsDepthUpdates(fills, price, side, market);
        this.publishWsTrades(fills,userId,market);
        return { executedQty, fills, orderId: order.orderId };
    }

    
    publishWsTrades(fills: Fill[], userId: string, market: string) {
        fills.forEach(fill => {
            RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: fill.otherUserId === userId, // TODO: Is this right?
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market,
                }
            });
        });
    }

    publishWsDepthUpdates(
        fills: Fill[],
        price: string,
        side: "buy" | "sell",
        market: string
    ){
       const orderbook = this.orderbooks.find(o => o.ticker() === market) 

       if (!orderbook) {
        return;
        }

        const depth = orderbook.getDepth();
        if(side === "buy") {
            const updatedAsks = depth.asks.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedBid = depth?.bids.find(x => x[0] === price);
            console.log("publish ws depth updates")
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsks,
                    b: updatedBid ? [updatedBid] : [],
                    e: "depth"
                }
            });
        }
        if (side === "sell") {
            const updatedBids = depth?.bids.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedAsk = depth?.asks.find(x => x[0] === price);
            console.log("publish ws depth updates")
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsk ? [updatedAsk] : [],
                    b: updatedBids,
                    e: "depth"
                }
            });
         }
 
        
    }

    updateDbOrders(order: Order, executedQty: number, fills: Fill[], market: string){
        RedisManager.getInstance().pushMessage({
            type: "ORDER_UPDATE",
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side,
            }
        });

        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: "ORDER_UPDATE",
                data: {
                    orderId: fill.markerOrderId,
                    executedQty: fill.qty
                }
            });
        });

    }

    createDbTrades(
        fills: Fill[],
        market: string,
        userId: string
    ){
        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: "TRADE_ADDED",
                data: {
                    market: market,
                    id: fill.tradeId.toString(),
                    isMaker: fill.otherUserId === userId, 
                    price: fill.price,
                    quantity: fill.qty.toString(),
                    quoteQuantity: (fill.qty * Number(fill.price)).toString(),
                    timestamp: Date.now()
                }
            })
        })
    }

    updateBalance(
        userId: string,
        baseAsset: string,
        quoteAsset: string,
        side: "buy" | "sell",
        fills: Fill[],
        executedQty: number
    ){
        const userBalances = this.balances.get(userId);


        if (!userBalances) {
            throw new Error("User balances not found");
        }

        if(side === 'buy') {
            fills.forEach(fill => {
                const otherUserBalances = this.balances.get(fill.otherUserId);

                if (!otherUserBalances) {
                    throw new Error("Other user balances not found");
                }

                userBalances[quoteAsset].available = userBalances[quoteAsset].available + (fill.qty * Number(fill.price))

                userBalances[quoteAsset].locked = userBalances[quoteAsset].locked - (fill.qty * Number(fill.price))

                otherUserBalances[baseAsset].locked = otherUserBalances[baseAsset].locked - fill.qty;

                otherUserBalances[baseAsset].available = otherUserBalances[baseAsset].available + fill.qty;
                
            })
        } else {
            fills.forEach(fill => {
                const otherUserBalances = this.balances.get(fill.otherUserId);

                if (!otherUserBalances) {
                    throw new Error("Other user balances not found");
                }

                userBalances[quoteAsset].available = userBalances[quoteAsset].available - (fill.qty * Number(fill.price))

                userBalances[quoteAsset].locked = userBalances[quoteAsset].locked + (fill.qty * Number(fill.price))

                otherUserBalances[baseAsset].locked = otherUserBalances[baseAsset].locked + fill.qty;

                otherUserBalances[baseAsset].available = otherUserBalances[baseAsset].available - fill.qty;
                
            })
        }
    }

    checkAndLockFunds(
        baseAsset: string,
        quoteAsset: string,
        side: "buy" | "sell",
        userId: string,
        price: string,
        quantity: string
    ){
        const userBalances = this.balances.get(userId);

        if (!userBalances) {
            throw new Error("User balances not found");
        }

        if(side === "buy") {
            if((userBalances[quoteAsset].available || 0) < Number(quantity) * Number(price)){
                throw new Error("Insufficient funds")
            }

            userBalances[quoteAsset].available = userBalances[quoteAsset].available - (Number(quantity) * Number(price));
            userBalances[quoteAsset].locked = userBalances[quoteAsset].locked + (Number(quantity) * Number(price));
        }else{
            if((userBalances[baseAsset].available || 0) < Number(quantity)){
                throw new Error("Insufficient funds")
            }
            userBalances[baseAsset].available = userBalances[baseAsset].available - (Number(quantity));
            userBalances[baseAsset].locked = userBalances[baseAsset].available - (Number(quantity));
        }
    }
    
}