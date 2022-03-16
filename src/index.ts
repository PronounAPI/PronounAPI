import express, { type Request } from 'express';
import got, { HTTPError } from 'got';
import { pronoundbmap } from './constants';
import { s } from '@sapphire/shapeshift';
import { stringify } from 'querystring';

const app = express();

interface PronounDBResponse {
    pronouns: string
}

interface PronounDBErrorResponse {
    error: number;
    message: string;
}

app.get('/api/v1/lookup', async (req, res) => {
    try {
        s.object({
            platform: s.string,
            id: s.string
        }).parse(req.query)
    } catch {
        res.send("no")
        return
    }
    let pronoundbResponse: PronounDBResponse
    try {
        pronoundbResponse = await got.get(`https://pronoundb.org/api/v1/lookup`, {
            searchParams: {
                platform: req.query.platform as string,
                id: req.query.id as string
            }
        }).json<PronounDBResponse>()
    } catch (e) {
        if (e instanceof HTTPError) {
            res.status(e.response.statusCode).send(JSON.parse(e.response.body as string))
            return
        }
        throw e
    }
    res.send({
        id: req.query.id,
        platform: req.query.platform,
        ...pronoundbmap[pronoundbResponse.pronouns]
    })
})

app.listen(3000)