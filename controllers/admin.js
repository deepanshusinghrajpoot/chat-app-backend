import jwt from "jsonwebtoken"
import { tryCatch } from "../middlewares/error.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretkey } from "../app.js";



const cookieOptions = {             

  maxAge: 15 * 60 * 1000,    
  sameSite: "none", 
  httpOnly: true,
  secure: true,

}



const adminLogin = tryCatch(async(req, res, next)=>{

   const { secretKey } = req.body;

   const isMatch = secretKey === adminSecretkey;

   if(!isMatch) return next(new ErrorHandler("Invalid admin key", 401))

   const token = jwt.sign(secretKey, process.env.JWT_SECRET)
   
   console.log(token);
/*
   return res.status(200).cookie("admin-token", token, { ...cookieOptions, maxAge: 1000 * 60 * 15 }).json({
       success: true,
       message: "Authenticated SuccessFully",
   })
*/

   return res.status(200).cookie("admin-token", token, cookieOptions).json({
          success: true,
          message: "Authenticated Successfully",
   });
   
})





const adminLogout = tryCatch(async(req, res, next)=>{

     return res.status(200).cookie("admin-token", "", {...cookieOptions, maxAge: 0} ).json({
         success: true,
         message: "Logged Out Successfully"
     })

})





const getAdminData = tryCatch(async(req, res, next)=>{
      return res.status(200).json({
        admin: true,
      })
})





const allUsers = tryCatch(async(req, res)=>{
     
    const users = await User.find({})
     
    const transformedUsers = await Promise.all(
        users.map(async({name, username, avatar, _id})=>{

            const [groups, friends] = await Promise.all([
                   Chat.countDocuments({groupChat: true, members: _id}),
                   Chat.countDocuments({groupChat: false, members: _id}),
            ])
    
            return {
                     name,
                     username,
                     avatar: avatar.url,
                     _id,
                     groups,
                     friends,
            }
        })
    )

    return res.status(200).json({
        success: true,
        users: transformedUsers,
    })
})





const allChats = tryCatch(async(req, res)=>{
         
      const chats = await Chat.find({})
                              .populate("members", "name avatar")
                              .populate("creator", "name avatar");

      const transformedChat = await Promise.all(chats.map(async({members, _id, groupChat, name, creator })=>{
          
           const totalMessages = await Message.countDocuments({chat: _id});
           
           
           return {
             _id, 
             groupChat,
             name,
             avatar: members.slice(0,3).map((member) => member.avatar.url),
             
             members: members.map(({_id, name, avatar}) => ({
                    _id,
                    name,
                    avatar: avatar.url,
             })), 
             creator: {
                name: creator?.name || "None", 
                avatar: creator?.avatar.url || "",
             },
             totalMembers: members.length,
             totalMessages
            
           }

             
      }))


      return res.status(200).json({
        success: true,
        transformedChat,
      })


})





const allMessages = tryCatch(async(req, res)=>{

       const messages = await Message.find({})
                                     .populate("sender", "name avatar")
                                     .populate("chat", "groupChat")


       const transeformedMessages = messages.map(({ _id,  attachments, content, sender, chat, createdAt })=>({           // () => ({})  :- in this arrow function after arrow use ({}) :- that mean we want to whole bracket to return
             
              _id,
              attachments,
              content,
              createdAt,
              chat: chat._id,
              groupChat: chat.groupChat,
              sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url,
              }

       }))

       return res.status(200).json({
         success: true,
         message: transeformedMessages,
       })
})





const getDashboardStats = tryCatch(async(req, res)=> {
    
  const  [ groupsCount, usersCount, messagesCount, totalChatsCount ] = await Promise.all([
        
     Chat.countDocuments({groupChat: true}),
     User.countDocuments(),
     Message.countDocuments(),
     Chat.countDocuments()

  ])

  const today = new Date();

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7 )

  const last7DaysMessages = await Message.find({
    createdAt: {
       $gte: last7Days,      // grater than equal to
       $lte: today,          // less than equal to
    }
  }).select("createdAt");

  const messages = new Array(7).fill(0);

  last7DaysMessages.forEach(message => {
     
      const indexApprox = (today.getTime() - message.createdAt.getTime())/(1000* 60 * 60 * 24);
      const index = Math.floor(indexApprox);

      messages[6 - index]++

  })

  const stats = {
      groupsCount,
      usersCount,
      messagesCount,
      totalChatsCount,
      messagesChart: messages,
  }
     
    return res.status(200).json({
      success: true,
      message: stats
    })
})





export {
          adminLogin,
          adminLogout,
          getAdminData,
          allUsers,
          allChats,
          allMessages,
          getDashboardStats,
}