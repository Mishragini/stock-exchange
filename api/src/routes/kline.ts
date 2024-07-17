import { Router } from "express";
import { Client } from "pg";

const pgClient = new Client(process.env.DATABASE_URL);
pgClient.connect();

export const klineRouter = Router();

klineRouter.get("/", async (req, res) => {
    const { market, startTime, endTime, interval } = req.query;

    if (!startTime || !endTime) {
        return res.status(400).send('startTime and endTime are required');
    }

    const start = Number(startTime);
    const end = Number(endTime);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).send('startTime and endTime must be valid numbers');
    }

    let query: string;
    switch (interval) {
        case '1m':
            query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2`;
            break;
        case '1h':
            query = `SELECT * FROM klines_1h WHERE bucket >= $1 AND bucket <= $2`;
            break;
        case '1w':
            query = `SELECT * FROM klines_1w WHERE bucket >= $1 AND bucket <= $2`;
            break;
        default:
            return res.status(400).send('Invalid interval');
    }

    try {
        const result = await pgClient.query(query, [new Date(start * 1000), new Date(end * 1000)]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err);
    }
});
