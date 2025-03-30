import express from "express";
import { acceptFriendRequest, getMyFriend, getMyNotification, getMyProfile, loginUser, logoutUser, newUser, searchUser, sendFriendRequest } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptFriendRequestValidator, loginValidator, registerValidator,  sendFriendRequestValidator,  validateHandler } from "../lib/validator.js";




const userRouter = express.Router();



userRouter.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);
userRouter.post("/login", loginValidator(), validateHandler, loginUser);




// After here user must be logged in to access the routes
userRouter.use(isAuthenticated)

userRouter.get("/me", getMyProfile );
userRouter.get("/logout", logoutUser);
userRouter.get("/search", searchUser);
userRouter.get("/notification", getMyNotification);
userRouter.get("/friends", getMyFriend);


userRouter.put("/send-request", sendFriendRequestValidator(), validateHandler, sendFriendRequest);
userRouter.put("/accept-request", acceptFriendRequestValidator(), validateHandler,  acceptFriendRequest);
    

export default userRouter;