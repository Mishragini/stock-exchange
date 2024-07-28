import { BASE_CURRENCY } from "./Engine";

export interface Order {
    price: number;
    quantity: number;
    orderId: string;
    filled: number;
    side: "buy" | "sell";
    userId: string;
}

export interface Fill {
    price: string;
    qty: number;
    tradeId: number;
    otherUserId: string;
    markerOrderId: string;
}

export class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string = BASE_CURRENCY;
    lastTradeId: number;
    currentPrice: number;

    private bidsObj: { [key: string]: number } = {};
    private asksObj: { [key: string]: number } = {};

    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number) {
        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.currentPrice = currentPrice || 0;

        this.initializeDepth();
    }

    private initializeDepth() {
        this.bids.forEach(order => this.updateDepth(order, true));
        this.asks.forEach(order => this.updateDepth(order, false));
    }

    private updateDepth(order: Order, isBid: boolean, isRemove: boolean = false) {
        const obj = isBid ? this.bidsObj : this.asksObj;
        const price = order.price.toString();

        if (!obj[price]) {
            obj[price] = 0;
        }

        obj[price] += isRemove ? -order.quantity : order.quantity;

        if (obj[price] <= 0) {
            delete obj[price];
        }
    }

    getSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        };
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    addOrder(order: Order) {
        if (order.side === "buy") {
            const { fills, executedQty } = this.matchBid(order);
            order.filled = executedQty;
            if (order.quantity === executedQty) {
                return {
                    executedQty,
                    fills
                };
            }
            this.bids.push(order);
            this.updateDepth(order, true);
            return {
                executedQty,
                fills
            };
        } else {
            const { executedQty, fills } = this.matchAsk(order);
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return {
                    executedQty,
                    fills
                };
            }
            this.asks.push(order);
            this.updateDepth(order, false);
            return {
                executedQty,
                fills
            };
        }
    }

    matchBid(order: Order) {
        const fills: Fill[] = [];
        let executedQty = 0;

        for (let i = 0; i < this.asks.length; i++) {
            if (this.asks[i].price <= order.price && executedQty < order.quantity) {
                const filledQty = Math.min(order.quantity - executedQty, this.asks[i].quantity);
                executedQty += filledQty;
                this.asks[i].filled += filledQty;
                fills.push({
                    price: this.asks[i].price.toString(),
                    qty: filledQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: this.asks[i].userId,
                    markerOrderId: this.asks[i].orderId
                });

                if (this.asks[i].filled === this.asks[i].quantity) {
                    this.updateDepth(this.asks[i], false, true);
                    this.asks.splice(i, 1);
                    i--;
                }
            }
        }

        return {
            fills,
            executedQty
        };
    }

    matchAsk(order: Order) {
        const fills: Fill[] = [];
        let executedQty = 0;

        for (let i = 0; i < this.bids.length; i++) {
            if (this.bids[i].price >= order.price && executedQty < order.quantity) {
                const filledQty = Math.min(order.quantity - executedQty, this.bids[i].quantity);
                executedQty += filledQty;
                this.bids[i].filled += filledQty;
                fills.push({
                    price: this.bids[i].price.toString(),
                    qty: filledQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: this.bids[i].userId,
                    markerOrderId: this.bids[i].orderId
                });

                if (this.bids[i].filled === this.bids[i].quantity) {
                    this.updateDepth(this.bids[i], true, true);
                    this.bids.splice(i, 1);
                    i--;
                }
            }
        }

        return {
            fills,
            executedQty
        };
    }

    getDepth() {
        const bids: [string, string][] = [];
        const asks: [string, string][] = [];

        for (const price in this.bidsObj) {
            bids.push([price, this.bidsObj[price].toString()]);
        }

        for (const price in this.asksObj) {
            asks.push([price, this.asksObj[price].toString()]);
        }

        return {
            bids,
            asks
        };
    }

    cancelBid(order: Order) {
        const index = this.bids.findIndex(x => x.orderId === order.orderId)
        if (index !== -1) {
            const price = this.bids[index].price;
            this.bids.splice(index, 1);
            return price
        }
    }
    cancelAsk(order: Order) {
        const index = this.asks.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const price = this.asks[index].price;
            this.asks.splice(index, 1);
            return price
        }
    }
}
