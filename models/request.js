import mongoose, { Types } from "mongoose";



const requestSchema = new mongoose.Schema({
           
      status: {type: String, default: "pending", enum: ["pending", "accepted", "rejected"], },
      sender: {type: Types.ObjectId, ref:"User", required: true, },
      receiver: {type: Types.ObjectId, ref:"User", required: true, },
      
      
},{timestamps: true,})



const Request =  mongoose.models.Request || mongoose.model("Request", requestSchema);

export default Request;