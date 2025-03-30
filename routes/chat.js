import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addMembers, deleteChat, getChatDetails, getMessage, getMyChats, getMyGroup, leaveGroup, newGroupChat, removeMembers, renameGroup, sendAttachment } from "../controllers/chat.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { addMemberValidator, chatIdValidator, newGroupValidator, removeMemberValidator, renameValidator, sendAttachmentsValidator, validateHandler } from "../lib/validator.js";



const chatRouter = express.Router();



// After here user must be Logged in to access the routes
chatRouter.use(isAuthenticated)

chatRouter.post("/new", newGroupValidator(), validateHandler, newGroupChat )
chatRouter.post("/message", attachmentsMulter, sendAttachmentsValidator(),  validateHandler , sendAttachment )

chatRouter.get("/my", getMyChats)
chatRouter.get("/my/group", getMyGroup)


chatRouter.put("/addmembers", addMemberValidator(), validateHandler, addMembers)
chatRouter.put("/removemember", removeMemberValidator(), validateHandler, removeMembers)

chatRouter.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup)      // It is a dynamic route
chatRouter.route("/:id")
         .get(chatIdValidator(), validateHandler, getChatDetails)
         .put(renameValidator(), validateHandler, renameGroup)
         .delete(chatIdValidator(), validateHandler, deleteChat)

chatRouter.get("/message/:id", chatIdValidator(), validateHandler, getMessage)


// Send Attachment

// Get Message

// Get chat Details, rename, delete 







chatRouter.get("/",(req, res)=>{
    return res.json({message: "this is a chat api"});
})
 
 



export default chatRouter



