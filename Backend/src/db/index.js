import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectToDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MongoDB_URI}/${DB_NAME}`,
        {  writeConcern: {
            w: 'majority',
          } }
        );
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host} \n`)
    } catch(err) {
        console.error("MongoDB connection error ", err);
        process.exit(1);
    }
}

export default connectToDB;