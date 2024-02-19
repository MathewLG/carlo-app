import { connectToDB } from '@utils/database';
export const dynamic = "force-dynamic";
import Memory from '@models/memory';

export const GET = async (request) => {
    try {
        await connectToDB();

        const memories = await Memory.find({}).populate('creator');

        return new Response(JSON.stringify(memories), {
            status: 200
        })

    } catch (error){
        return new Response("No se pudo descargar los recuerdos", {
            status: 500
        })
    }
}