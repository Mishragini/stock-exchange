import { RedisClientType, createClient } from "redis";
import { MessageFromOrderbook, messageToEngine } from "./types";

export class RedisManager {
    private static instance: RedisManager
    private client: RedisClientType
    private publisher: RedisClientType 

    private constructor(){
        this.client = createClient();
        this.client.connect();
        this.publisher = createClient();
        this.publisher.connect();
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager()
        }
        return this.instance;
    }

    public subscribeAndPushToQueue(message: messageToEngine){
        return new Promise<MessageFromOrderbook>((resolve)=>{
            const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            this.client.subscribe(id, (message) => {
                this.client.unsubscribe(id);
                resolve(JSON.parse(message))
            });

            this.publisher.lPush("orders", JSON.stringify({orderId:id, message}))
        })
    }
}