import { envMode } from "../app.js";


const errorMiddleware = (error, req, res, next) => {

    error.message ||= "Internal Server Error";
    error.statusCode ||= 500;



  //  error : "E11000 duplicate key error collection: chat-app.users index: username_1 dup key: { username: \"khgfdds\" }"
   if(error.code === 11000){
      const errr = Object.keys(error.keyPattern).join(",");
      error.message = `Dublicate field - ${errr}`
      error.statusCode = 400;
   }

  
  // "Cast to ObjectId failed for value \"7b7fa704255dc6d44686514\" (type string) at path \"_id\" for model \"Chat\""
   if(error.name === "CastError") {
      const errorPath = error.path;
      error.message = `Invalid Format of ${errorPath}`;
      error.statusCode = 400;
   }

  // console.log(process.env.NODE_ENV.trim() , "DEVELOPMENT")
    return res.status(error.statusCode).json({
        success: false,
        message: envMode === "DEVLOPMENT" ? error : error.message,
    });

}



const tryCatch = (passedFunc) => async(req, res, next) => {
           
        try{
               await passedFunc( req, res, next);

        } catch (error) {

               next(error);

        }
}


export { errorMiddleware, tryCatch }