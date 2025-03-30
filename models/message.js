import mongoose, { Types } from "mongoose";



const messageSchema = new mongoose.Schema({

      content: String,
      attachments:[{public_id:{type: String, required: true, }, url:{type:String, required: true }, },],
      sender: {type: Types.ObjectId, ref:"User", required: true, },
      chat: {type: Types.ObjectId, ref:"Chat", required:true, },
      
},{timestamps: true,})



const Message =  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;