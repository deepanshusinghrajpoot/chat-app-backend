import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { tryCatch } from "../middlewares/error.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import { deleteFileFromCloudinary, emitEvent, uploadFileToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

// controll function are use to create new group for chat
const newGroupChat = tryCatch(async(req, res, next) => {
        
      const { name, members } = req.body;

      const allMembers = [...members, req.userId];

      await Chat.create({
        name, 
        groupChat: true,
        creator: req.userId,
        members: allMembers,
      })

      emitEvent(req, ALERT, allMembers, `Welcome to ${name} group` );
      emitEvent(req, REFETCH_CHATS, members)


      return res.status(201).json({success: true, message: "Group created"})

})



// getMyChats controller function use get my chats with my member (freind, group friend)
const getMyChats = tryCatch(async(req, res, next) => {

  const chats = await Chat.find({members: req.userId}).populate("members", "name  avatar")   //  populate function working :-  all key fo user find but in *** member key contain id && name && avatar *** example  
                  // json({success: true, chats})   //  { "success": true, "chats": [{ "_id": "67b6ae69d4789cff879db568", "name": "Won Group", "groupChat": true, "creator": "67b6a30b81a33833dc2c8e26", "members": [ { "avatar": {"public_id": "scholarship_unexpectedly.rng", "url": "https://avatars.githubusercontent.com/u/25766577"  }, "_id": "67b6ad026a166cd8d9586a97", "name": "Beth Collier" }, ],"createdAt": "2025-02-20T04:24:09.314Z", "updatedAt": "2025-02-20T04:24:09.314Z", "__v": 0 }] }

  const transFormedChats = chats.map(({_id, name, members, groupChat})=>{

      const otherMember =  getOtherMember(members, req.userId);

      return {

        _id,
        groupChat,
        avatar: groupChat ? members.slice(0,3).map(({avatar})=> avatar.url) : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {
          if(curr._id.toString() !== req.userId.toString()){
             prev.push(curr._id);
          }
          return prev;
        }, []),

      }
  })

  return res.status(200).json({success: true, chats: transFormedChats})

})


// getMyGroup controller function use get my group
const getMyGroup = tryCatch(async(req, res, next)=>{

  const chats = await Chat.find({
      members: req.userId,
      groupChat: true,
      creator: req.userId,
  }).populate("members", "name avatar")

  const groups = chats.map(({members, _id, groupChat, name})=>({
       
        _id,
        groupChat,
        name,
        avatar : members.slice(0,3).map(({avatar})=> avatar.url)

  }))

  return res.status(200).json({success: true, groups})

})




// addMember controller function use to add member in group which is created by me
const addMembers = tryCatch(async(req, res, next)=>{
        
     const { chatId, members } = req.body;
     
     const chat = await Chat.findById(chatId);

     if(!chat) return next(new ErrorHandler("Chat not found", 404));
     if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400))
     if(chat.creator.toString() !== req.userId.toString()){ return next(new ErrorHandler("You are not allow to add member", 403))}

     const allNewMembersPromise = members.map( (i) => User.findById(i).select("+name") )

     const allNewMembers = await Promise.all(allNewMembersPromise);

     const uniqueMembers = allNewMembers
                                        .filter((i)=> !chat.members.includes(i._id.toString()))
                                        .map((i)=> i._id);
     
     chat.members.push(...uniqueMembers);

     if(chat.members.length > 500){ return next(new ErrorHandler("Group members limit reached", 400))}

     await chat.save()

     const allUserName = allNewMembers.map((i)=> i.name).join(",");

     emitEvent(
       req,
       ALERT,
       chat.members,
       `${allUserName} has  been added in the group`
     )

     emitEvent(req, REFETCH_CHATS, chat.members);

     return res.status(200).json({
           success: true,
           message: "Members add successfully",
     })
})




// removeMembers controller function is use to remove a particular member from group
const removeMembers = tryCatch(async(req, res, next)=>{
   
  const { userID, chatId } = req.body;

  const [ chat, userThatWillBeRemoved ] = await Promise.all([
       Chat.findById(chatId),
       User.findById(userID, "name"),   // .select("+name")
  ])

  if(!chat) return next(new ErrorHandler("Chat not found", 404));
  if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));
  if(chat.creator.toString() != req.userId.toString()) return next(new ErrorHandler("You are not allowed to add members", 403))

  if(chat.members.length <= 3) return next(new ErrorHandler("Group must have at least 3 members", 400));


  const allChatMembers = chat.members.map((memberID)=> memberID.toString());


  chat.members = chat.members.filter((memberID)=> memberID.toString() !== userID.toString())

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
   {
    message:`${userThatWillBeRemoved.name} has been removed from the group`,
    chatId
   }
  )

  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({success: true, message:"Members removed successfully"})
})






// leaveGroup controller function are use to exist group self
const leaveGroup = tryCatch(async(req, res, next) => {
    
      const chatId = req.params.id 
    
      const chat = await Chat.findById(chatId);

      if(!chat) return next(new ErrorHandler("Chat not found", 404));

      if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

      const remainingMembers = chat.members.filter((memberID)=>  memberID.toString() !== req.userId.toString());

      if(remainingMembers.length < 3) return next(new ErrorHandler("Group must have at least 3 members", 400))
      
      if(chat.creator.toString() === req.userId.toString()){
         // const randomElement = Math.floor(Math.random() * remainingMembers.length);

         const newCreator = remainingMembers[0];
         chat.creator = newCreator;
      }
 
      chat.members = remainingMembers;
 
      const [user] = await Promise.all([User.findById(req.userId, "name"), chat.save() ]);

      emitEvent(
        req,
        ALERT,
        chat.members,
        {
          message:`User ${user.name} has left the group`,
          chatId,
        }
      )

      return res.status(200).json({
        success: true,
        message: "leave Group successfully"
      })
})






// sendAttachment controller function is use to send some data throught attachment
const sendAttachment = tryCatch(async(req, res, next)=>{
    
      const {chatId} = req.body;

      const file = req.files || [];

      console.log(file);
      
      if(file.length < 1) return next(new ErrorHandler("Please Upload Attachments", 400))

      if(file.length > 5) return next(new ErrorHandler("Files Can't more than 5"), 400)

      const [chat, me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.userId),
      ])

      if(!chat) return next(new ErrorHandler("Chat not found", 404));
      
      
      if(file.length < 1) return next(new ErrorHandler("Please provide attachments", 400));
       
      // Upload files here
      const attachments = await uploadFileToCloudinary(file);
 
      
      const messageForDB = { 

                               content:"", 
                               attachments, 
                               sender: me._id, 
                               chat:chatId
                              
      };

      const messageForRealTime = {

                ...messageForDB,
                sender: {
                  _id: me._id,
                  name: me.name,
                }, 

      };


      const message = await Message.create(messageForDB);

      emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageForRealTime,
        chatId,
      })                   

      emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId } );

      return res.status(200).json({
        success: true,
        message,
      })
})





// getChatDetails controller function is use to get data about chat
const getChatDetails = tryCatch(async(req, res, next)=>{
   
     if(req.query.populate === "true"){

        const chat = await Chat.findById(req.params.id)
                       .populate("members", "name avatar")
                       .lean()    // when lean() method is use than chat.members is nat a key of Data Base 

        if(!chat) return next(new ErrorHandler("Chat not found", 404));
        
        chat.members = chat.members.map(({_id, name, avatar})=>({
           
             _id,
             name,
             avatar: avatar.url,

        }));

        res.status(200).json({
          success: true,
          chat,
        })

     } else{
        
        const chat = await Chat.findById(req.params.id);

        if(!chat) return next(new ErrorHandler("chat not found", 404));

        return res.status(200).json({
          success: true,
          chat,
        })

     }
})





// renameGroup controller function use to rename the group
const renameGroup = tryCatch(async(req, res, next)=>{

     const chatId = req.params.id;
     const {name} = req.body;
     
     const chat = await Chat.findById(chatId);
    
     if(!chat) return next(new ErrorHandler("Chat not found", 404));

     if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

     if(chat.creator.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not allowed to rename the group", 403))
     
     chat.name = name;
     await chat.save();

     emitEvent(req, REFETCH_CHATS, chat.members);

     return res.status(200).json({
       success: true,
       message: "Group renamed successfully",
     })

})



// deleteChat controller function use to delete chat 
const deleteChat = tryCatch(async(req, res, next)=>{
     
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if(!chat) return next(new ErrorHandler("chat not found", 404));

  const members = chat.members;

  if(chat.groupChat && chat.creator.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not allowed to delete the group", 403));

  if(!chat.groupChat && !chat.members.includes(req.userId.toString())) return next(new ErrorHandler("You are not allowed to delete the chat", 403));

  // Here we have to delete all message as well as attachements or files from cloudinary

  const messageWithAttachments = await Message.find({
         chat: chatId,
         attachments: {$exists: true, $ne: []},      // $ne => not equal to
  })
 
  const public_ids = [];

  messageWithAttachments.forEach(({attachments}) => {
      attachments.forEach(({public_id})=> public_ids.push(public_id))
  })
   
  await Promise.all([
     // Delete files from cloudinary
     deleteFileFromCloudinary(public_ids),
     chat.deleteOne(),
     Message.deleteMany({chat: chatId}),
  ])

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat Deleted successfully",
  })

})



// getMessage controller function use to get message acording to pagination
const getMessage = tryCatch(async(req, res, next)=>{
   
       const chatId = req.params.id;
       const { page = 1 } = req.query;

       const resultPerPage = 20;
       const skip = (page - 1) * resultPerPage;

       const chat = await Chat.findById(chatId);

       if(!chat) return next(new ErrorHandler("Chat not found", 404));

       //console.log(chat.members.includes(req.userId.toString()));
       if(!chat.members.includes(req.userId.toString())){
          return next(new ErrorHandler("You are not allow to access this chat", 403));
       }

       const [messages, totalMessagesCount] = await Promise.all([
          Message.find({chat: chatId})
             .sort({createdAt: -1})
             .skip(skip)
             .limit(resultPerPage)
             .populate("sender", "name")
             .lean(), 
             Message.countDocuments({chat : chatId}),
       ])

      
       const totalPages = Math.ceil(totalMessagesCount / resultPerPage)  || 0 ;

       return res.status(200).json({
           success: true,
           message: messages.reverse(),
           totalPages,
       })
})









export { 

         newGroupChat, 
         getMyChats, 
         getMyGroup, 
         addMembers, 
         removeMembers, 
         leaveGroup , 
         sendAttachment,
         getChatDetails,
         renameGroup,
         deleteChat,
         getMessage

                            }