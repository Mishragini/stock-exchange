export type messageToEngine = {
    type:  'CREATE_ORDER',
    data: {
        market: string,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    }
}| {
    type: "CANCEL_ORDER",
    data: {
        orderId: string,
        market: string
    }
} | {
    type: "GET_OPEN_ORDERS",
    data: {
        userId: string,
        market: string
    }
} | {
    type:"GET_BALANCE",
    data:{
        userId: string
    }
} | {
    type: "ON_RAMP",
    data:{
        userId: string,
        amount: number,
        txnId: string
    }
} | {
    type:"GET_DEPTH",
    data:{
       market: string
    }
} | {
    type: "GET_TICKER",
    data:{
        market: string
    }
} | {
    type:"GET_TRADES",
    data:{
        market: string
    }
}

export type MessageFromOrderbook = {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: number,
        fills: [
            {
                price: string,
                qty: number,
                tradeId: number
            }
        ]
    }
} | {
    type: "ORDER_CANCELLED",
    payload: {
        orderId: string,
        executedQty: number,
        remainingQty: number
    }
} | {
    type: "OPEN_ORDERS",
    payload: {
        orderId: string,
        executedQty: number,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    }[]
} | {
    type: "USER_BALANCE" ,
    payload: {
        availableBalance: number,
        lockedBalance: number
    }
} | {
    type: "ON_RAMPED",
    payload:{
        success: boolean,
        transactionId: string
    }
} | {
    type: "DEPTH",
    payload: {
        market: string,
        bids: [string, string][],
        asks: [string, string][],
    }
} | {
    type: "TICKER",
    payload:{
        symbol: string,
        price: number,
        open: number,
        high: number,
        low: number,
        close: number,
        volume: number,
        marketCap: number,
        change: number,
        changePercent: number,
        timestamp: string
    }
} | {
    type : "TRADES",
    payload:{
        tradeId: number;
        symbol: string;
        price: number;
        quantity: number;
        timestamp: string;
        buyerId: string;
        sellerId: string;
    }[]
}