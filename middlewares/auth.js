import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { tryCatch } from "./error.js";
import { adminSecretkey } from "../app.js";
import { CHAT_TOKEN } from "../constants/config.js";
import User from "../models/user.js";




const isAuthenticated = (req, res, next) => {

   // console.log("cookie:",req.cookies["chat-token"]);     // For geting cookie we use middleware cookie parser in app.js
     
    const token = req.cookies[CHAT_TOKEN];

    if(!token) return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(token, process.env.JWT_SECRET); 
   // console.log(decodedData);

    req.userId = decodedData._id;

    next();
}




const adminOnly = (req, res, next) => {

    // console.log("cookie:",req.cookies["chat-token"]);     // For geting cookie we use middleware cookie parser in app.js
      
     const token = req.cookies["admin-token"];
 
     if(!token) return next(new ErrorHandler("Only admin access this route", 401));
 
     const secretKey = jwt.verify(token, process.env.JWT_SECRET); 
    // console.log(decodedData);
 
     const isMatch = secretKey === adminSecretkey;

     if(!isMatch) return next(new ErrorHandler("Invalid admin key", 401))
 
     next();
 }






 const socketAuthenticator = async(err, socket, next) => {
     
      try {

        if(err) return next(err);

        const authToken = socket.request.cookies[CHAT_TOKEN];

        if(!authToken) return next(new ErrorHandler("Please login to access this route", 401));

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET );
        
        const user = await User.findById(decodedData._id);

        if(!user) return  next(new ErrorHandler("Please login to access this route", 401));

        socket.user = user;

        return next();
        
      } catch (error) {
         console.log(error);
         return next(new ErrorHandler("Please login to access this route", 401));
      }
 }


export { isAuthenticated, adminOnly, socketAuthenticator }