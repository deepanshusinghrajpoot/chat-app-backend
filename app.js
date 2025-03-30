import express from "express";
import { connectDB } from "./utils/features.js";
import  dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import {v4 as uuid} from "uuid"
import cors from 'cors'
import { v2 as cloudinary } from 'cloudinary'



import {createServer} from "http"
import {Server} from "socket.io"



import { createUser } from "./seeders/user.js";
import { createSingleChat, createGroupChat, createMessageInChat } from "./seeders/chat.js";
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import Message from "./models/message.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";



import userRouter from "./routes/user.js";
import adminRoute from "./routes/admin.js";
import chatRouter from "./routes/chat.js";



dotenv.config({
    path: "./.env",
});

const mongoURI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";

const adminSecretkey = process.env.ADMIN_SECRET_KEY || "hasdwldddiwqjd";

const userSocketIDs = new Map();
const onlineUsers = new Set();

connectDB(mongoURI);
                                  // createUser(10)    call to create fake data
                                  //  createSingleChat(10)
                                  // createGroupChat(10)
                                  // createMessageInChat("67b87522be02fe6a3bca8b2a", 50)

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET, 
})







const app = express();
const server = createServer(app); 
const io = new Server(server, {cors: corsOptions,});

app.set("io", io );


// use here middleware 
app.use(express.json());          // this use to get JSON(raw) data from body
app.use(cookieParser());          // this is use to get cookie from local machine 
app.use(cors(corsOptions));


app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRoute);


app.get("/",(req, res)=>{
    res.send("Hellow you are in home page");
})





io.use((socket, next )=>{
    
   cookieParser()(
       socket.request, 
       socket.request.res, 
       async(err) => await socketAuthenticator(err, socket, next),  
   )

})


io.on("connection", (socket)=>{
     
     const user = socket.user;
    
     userSocketIDs.set(user._id.toString(), socket.id);

     console.log(userSocketIDs);   

     socket.on(NEW_MESSAGE, async({chatId, members, message})=>{

        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender:{
                _id: user._id,
                name: user.name,
            },
            chat: chatId,
            createdAt: new Date().toISOString(),
        }


        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        }


                                                                                       // console.log("Emitting", messageForRealTime)

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime, 
        });
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {
            chatId,     
        })

        
        try {
            await Message.create(messageForDB);
        } catch (error) {
            throw new Error(error);
        }
     })


     socket.on(START_TYPING, ({members, chatId}) => {
         console.log(" StartTyping:-", members, chatId );

         const membersSockets = getSockets(members);
         socket.to(membersSockets).emit(START_TYPING, {chatId} );
     })

     socket.on(STOP_TYPING, ({members, chatId}) => {
        //console.log("StopTyping:-", members, chatId );

        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(STOP_TYPING, {chatId} );
     })

     socket.on(CHAT_JOINED, ({userId, members})=>{
        onlineUsers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
     })
     socket.on(CHAT_LEAVED, ({userId, members})=>{
        onlineUsers.delete(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
     })

     socket.on("disconnect", ()=>{
        // console.log("user disconnected")
         userSocketIDs.delete(user._id.toString())
         onlineUsers.delete(user._id.toString());
         socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
     })
})











app.use(errorMiddleware);


server.listen(PORT, ()=>{
    console.log(`Server is runing on port ${PORT} in ${envMode} mode`);
})






export {
         adminSecretkey,
         envMode,
         userSocketIDs,
}