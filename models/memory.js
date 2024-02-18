import { Schema, model, models } from 'mongoose';

const MemorySchema = new Schema({
    creator: {
        type: Schema.Types.ObjectId, 
        ref: 'User', 
    }, 
    memory: {
        type: String, 
        required: [true, 'Por favor ingresa un mensaje'],
    }, 
    tag: {
        type: String, 
        required: [true, 'Por favor ingresa una categoria'],
    }
    
});

const Memory = models.Memory || model('Memory', MemorySchema);

export default Memory;