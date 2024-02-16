import mongoose, {Schema} from 'mongoose';

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId, // the user who is subscribing
            ref: 'User',
        },
        channel: {
            type: Schema.Types.ObjectId, // the user who is being subscribed by other users
            ref: 'User',
        }

},{
    timestamps:true
})



export const Subscription = mongoose.model("Subscription", subscriptionSchema)