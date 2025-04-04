import { tryCatch } from "../middlewares/error.js";
import User from "../models/user.js";
import {faker} from "@faker-js/faker"

// seeders folder are use to create fack data 



const createUser = async(numUsers)=>{
    try{
         const userPromise = [];

         for(let i =0; i< numUsers; i++){
            const tempUser = User.create({
                name: faker.person.fullName(),
                username: faker.internet.domainName(),
                bio: faker.lorem.sentence(10),
                password: "password",
                avatar: {
                          url:faker.image.avatar(),
                          public_id:faker.system.fileName(),
                                                                   },
            })

            userPromise.push(tempUser)
         }

         await Promise.all(userPromise)

         console.log("User Created", numUsers)
         process.exit(1)
    } catch(error){
        console.error(error)
        process.exit(1)
    }
}






export {createUser}