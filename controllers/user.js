
import { compare } from "bcrypt";
import User from "../models/user.js"
import { cookieOptions, emitEvent, sendToken, uploadFileToCloudinary } from "../utils/features.js";
import { tryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import Chat from "../models/chat.js";
import Request from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";


// Create a new user and save it to the database and save in cookie
const newUser = tryCatch(async(req, res, next) => {

    const { name, username, password, bio } = req.body;

    const file = req.file;

    if(!file) return next(new ErrorHandler("Please upload file", 400));


    const result = await uploadFileToCloudinary([file]);


    const avatar = {
         public_id: result[0].public_id,
         url: result[0].url,
    }
    


    const user = await User.create({ name, username, password, bio, avatar });

    
    sendToken(res, user, 201, "User Created");

})



//  login user and save token in cookie
const loginUser = tryCatch(async (req, res, next) => {

        const { username, password } = req.body;

        const user = await User.findOne({username}).select("+password");
    
        if(!user) return next(new ErrorHandler("Invalid username or password ", 404));
        
        const isMatch = await compare(password, user.password);
    
        if(!isMatch) return next(new ErrorHandler("Invalid username or password", 404));
    
        sendToken(res, user, 200, `Welcom Back, ${user.name} created`);

})


// get user profile 
const getMyProfile = tryCatch(async (req, res, next) => {

    const user = await User.findById(req.userId).select("-password");

    if(!user)  return next(new ErrorHandler("User not found", 404));

    res.status(200).json({ success: true, data: user, })
})


// logout user
const logoutUser = tryCatch(async (req, res) => {

   return   res.status(200)
               .cookie("chat-token","",{...cookieOptions, maxAge:0})
               .json({ success: true, message: "Logged out successfully", });

})





const searchUser = tryCatch(async (req, res) => {
    
    const { name = "" } = req.query;                 //   http://loclhost:3000/user/search?name=Deepanshu    after ? is called query
    
    // Finding All my chats
    const myChats = await Chat.find({groupChat: false, members: req.userId});

    // Extracting All Users from my chat mean friends or people I have chatted with 
    const allUsersFromMyChats = myChats.map((chat)=> chat.members).flat()      // if not apply method:- flat() :- { "success": true, message": [ [ "67b5684ef4988c9e6281e833", "67b6a30b81a33833dc2c8e26"], [ ], ... ] }
                                                                               // if apply method :- flat() or flatMap() :-  { "success": true, "message": [ "67b5684ef4988c9e6281e833", "67b6a30b81a33833dc2c8e26", ... ] }
    // Finding all users except me and my friends
    const allUsersExpectMeAndFriends = await User.find({
        _id:{ $nin: allUsersFromMyChats },    
        name: { $regex: name, $options: "i"},      // options: "i" :- mean case insensitive
    })

    // Modifying the response
    const users = allUsersExpectMeAndFriends.map(( {_id , name, avatar} ) => ({
        _id,
        name,
        avatar: avatar.url,
    }))

    return  res.status(200).json({ success: true, users, allUsersFromMyChats, allUsersExpectMeAndFriends  });
 
 })
 




const sendFriendRequest = tryCatch(async(req, res, next)=> {
       
    const { userID } = req.body;

    const request = await Request.findOne({
        $or: [
            { sender: req.userId, receiver: userID },
            { sender: userID, receiver: req.userId },
        ],
    }) 
    
    if(request) return next(new ErrorHandler("Request already sent", 400));

    await Request.create({
        sender : req.userId,
        receiver : userID,
    }) 

    emitEvent(req, NEW_REQUEST, [userID]);

    res.status(200).json({
        success: true,
        message: "Friend Request send successfully!"
    })

})



const acceptFriendRequest = tryCatch(async(req, res, next) => {
   
     const { requestID, accept } = req.body;

     const request = await Request.findById(requestID)
                                  .populate("sender", "name")
                                  .populate("receiver", "name")

     

     if(!request) return next(new ErrorHandler("Request not found", 404));
     
     
     if(request.receiver._id.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not authorized to accept this request", 401));
     
     if(!accept){
        await request.deleteOne();

        return res.status(200).json({
            success: true,
            message:"Friend Request Rejected",
        })
     }

     const members = [ request.sender._id, request.receiver._id];

     await Promise.all([
        Chat.create({
            members,
            name: `${request.sender.name}-${request.receiver.name}`,
        }),
        request.deleteOne(),
     ])

     emitEvent(req, REFETCH_CHATS, members)

     return res.status(200).json({
        success: true,
        message: "Friend Request Accepted",
        senderId: request.sender._id,
     })  
          
}) 
          




const getMyNotification = tryCatch(async(req, res, next)=>{
    
    const requests = await Request.find({receiver: req.userId})
                                 .populate(
                                    "sender",
                                    "name avatar"
                                 );
    const allRequests = requests.map(({_id, sender})=> ({
            _id,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url,
            },
    }));

    return res.status(200).json({
        success: true,
        allRequests,
    });


})





const getMyFriend = tryCatch(async(req, res, next) => {
     
    const chatId = req.query.chatId;
    //console.log(chatId)
    const chats = await Chat.find({ members: req.userId,  groupChat: false })
                            .populate("members", "name avatar")

    // console.log(chats)
    const friends = chats.map(({members})=>{

         const  otherUser = getOtherMember(members, req.userId);    
           
         return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url,
         }
    })

   // console.log(friends)

    if(chatId){
        
        const chat = await Chat.findById(chatId);

        const availableFriends = friends.filter(
            (friend)=> !chat.members.includes(friend._id)
        );
        
        return res.status(200).json({
            success: true,
            friends: availableFriends,
        })

    } else {
       
        return res.status(200).json({
            success:true,
            friends,
        })

    }

})







export { 
           newUser, 
           loginUser, 
           getMyProfile, 
           logoutUser, 
           searchUser,
           sendFriendRequest,
           acceptFriendRequest,
           getMyNotification,
           getMyFriend
}



