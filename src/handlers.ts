import { FastifyRequest, FastifyReply } from "fastify";
const https = require('follow-redirects').https;

export async function getPokemonByName(request: FastifyRequest, reply: FastifyReply) {
    const name: string = request.params['name'] ? request.params['name'].trim() : null
    const hostname = `www.pokeapi.co`;
    var urlApiPokeman = `/api/v2/pokemon/`;
    urlApiPokeman = name ? urlApiPokeman +name + '?offset=20' + "&limit=20" : urlApiPokeman + '?offset=20' + "&limit=20"
    const agent = new https.Agent({ keepAlive: true })

    let response:any = ''
    const options = {
        hostname,
        path: urlApiPokeman,
        method: 'GET',
        agent:agent,
        headers: {
            'Accept': 'application/json',
        },
    };

    try{
        response = await new Promise((resolve,reject) => {
            const req = https.request(options, (res) => {
                if(res.statusCode === 404){
                    reject(false)
                    return
                }
                let str = ''
                res.on('data', (chunk) => {
                    str+=chunk
                });
                res.on('end', () => {
                    resolve(str);
                });
            })
            req.end();
        })
    }catch (e) {
        reply.code(404).send({status:false,message:'404 Not Found'})
        return
    }

    if (!response) {
        console.log('Proper error')
        reply.code(404)
    }

    response = JSON.parse(response)
    if(name){
        await computeResponse(response, reply)
    }
    reply.send(response)
    return reply
}

export const computeResponse = async (response, reply: FastifyReply) =>
{
    /**
    * Compute pokemon types
    * */
    let types = response.types.map(type => type.type.url)
    let pokemonTypes = []
    let promises = []
    const agent = new https.Agent({ keepAlive: true });
    types.forEach(element => {
        const promise = new Promise((resolve,reject) => {
            const {host, pathname} = new URL(element)
            const req = https.request({ host,path:pathname,agent }, (response) => {
                let str = ''
                response.on('data', (chunk) => {
                    str+=chunk
                });
                response.on('end', () => {
                    resolve(str);
                });
            })
            req.end();
        })
        promises.push(promise)
    });
    await Promise.all(promises).then((responses) => {
        for (const response of responses) {
            const data = response ? JSON.parse(response) : null
            delete data.pokemon // Remove excess data of other pokemon(s)
            pokemonTypes.push(data)
        }
    })
    response.types = pokemonTypes

    /**
     * Compute pokemon stats
     * */
    response.stats.forEach((st,i) => {
        var stats = []
        stats.push(st.base_stat)
        if (stats) {
            st.averageStat = stats.reduce((a, b) => a + b) / stats.length
        } else {
            st.averageStat = 0
        }
        response.stats[i] = st
    });

}

