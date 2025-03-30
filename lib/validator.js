import { body, param, query, validationResult } from "express-validator"
import { ErrorHandler } from "../utils/utility.js";



const validateHandler = (req, res, next) => {
    const errors = validationResult(req);
    
    const errorMessages = errors.array().map((error) => error.msg ).join(",");

    if(errors.isEmpty()) return next()
    else next(new ErrorHandler(errorMessages, 400))
}



const registerValidator = () => [
     body("name", "Please Enter Name").notEmpty(),
     body("username", "Please Enter Username").notEmpty(),
     body("bio", "Please Enter Bio").notEmpty(),
     body("password", "Please Enter Password").notEmpty(),
];


const loginValidator = () => [
     body("username", "Please Enter Username").notEmpty(),
     body("password", "Please Enter Password").notEmpty(),
]

 


const newGroupValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("members").notEmpty().withMessage("Please Enter Members").isArray({min: 2, max: 500}).withMessage("Members must be 2-500"),
]



const addMemberValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
  // body("userID", "Please Enter User ID").notEmpty()
]




const removeMemberValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
    body("userID", "Please Enter User ID").notEmpty()
]




const sendAttachmentsValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
]




const chatIdValidator = () => [
    param("id", "Please Enter Chat ID").notEmpty(),
]



const renameValidator = () => [
    param("id", "Please Enter Chat ID").notEmpty(),
    body("name", "Please Enter New Group Name").notEmpty()
]



const sendFriendRequestValidator = () => [
    body("userID", "Please Enter User ID").notEmpty()
]


const acceptFriendRequestValidator = () => [
    body("requestID", "Please Enter Request ID").notEmpty(),
    body("accept").notEmpty().withMessage("Please Add Accept").isBoolean().withMessage("Accept must be a boolean"),
]


const adminLoginValidator = () => [
    body("secretKey", "Please Enter Secret Key ID").notEmpty(),
]



export {
           validateHandler,
           registerValidator,
           loginValidator,
           newGroupValidator,
           addMemberValidator,
           removeMemberValidator,
           sendAttachmentsValidator,
           chatIdValidator,
           renameValidator,
           sendFriendRequestValidator,
           acceptFriendRequestValidator,
           adminLoginValidator   
}