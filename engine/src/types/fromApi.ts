export type fromApi = {
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