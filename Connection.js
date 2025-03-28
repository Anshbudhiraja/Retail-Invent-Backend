const mongoose=require("mongoose")
require("dotenv").config()
const Connection=async()=>{
   try {
      await mongoose.connect(process.env.MONGO_URL)
      return console.log("Connected to MongoDB"); 
   } catch (error) {
      return console.log("Error Occured in connecting mongodb: "+error)
   }
}
module.exports=Connection