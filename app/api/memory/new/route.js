import { connectToDB } from '@utils/database';
import Memory from '@models/memory';
export const POST = async(req) => {
    const { userId, memory, tag} = await req.json();

    try{
        await connectToDB();
        const newMemory = new Memory({ 
            creator : userId, 
            memory, 
            tag    
        })
        await newMemory.save();
        return new Response(JSON.stringify(newMemory), {
            status: 201
        })
    } catch (error) {
        return new Response("No se pudo agregar el recuerdo", {status: 500})
    }
}