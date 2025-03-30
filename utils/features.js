import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {v4 as uuid} from "uuid";
import { v2 as cloudinary } from 'cloudinary'
import { getBase64, getSockets } from "../lib/helper.js";


// cookie is save in local machine at max 15 day
const cookieOptions = {             

    maxAge: 15 * 24 * 60 * 60 * 1000,    
    sameSite: "none", 
    httpOnly: true,
    secure: true,

}





const connectDB = (url) => {

    mongoose.connect(url,{dbName: 'chat-app'})
    .then((data)=>{ console.log(`Connect to DB: ${data.connection.host}`)})
    .catch((error)=> { throw error });

}


const sendToken = (res, user, code, message) => {
         
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    
    return res.status(code).cookie("chat-token", token, cookieOptions).json({
         success: true,
         user,
         message,
    });

}



const emitEvent = (req, event, users, data) => {
      
      const io = req.app.get("io");

      const usersSocket = getSockets(users);
      io.to(usersSocket).emit(event, data);

};


const uploadFileToCloudinary = async(files=[]) => {

     const uploadPromises = files.map((file)=>{
           return new Promise((resolve, reject) => {
              cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type: "auto",
                    public_id: uuid(),
                },
                (error, result) => {
                    if(error) return reject(error);
                    resolve(result);
                }
              )
           })   
     })

    try {
        const results = await Promise.all(uploadPromises);

        const formettedResults = results.map((result)=>(
             {
               public_id: result.public_id,
               url: result.url,
             }
        ))

        return formettedResults;
    } catch (error) {
        throw new Error("Error uploading files to cloudinary", error);
    }

}

const deleteFileFromCloudinary = async(public_ids) => {

}


export  { 
           connectDB, 
           sendToken, 
           cookieOptions, 
           emitEvent,
           deleteFileFromCloudinary,
           uploadFileToCloudinary,
        }