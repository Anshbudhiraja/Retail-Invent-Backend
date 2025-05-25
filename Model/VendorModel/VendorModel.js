const mongoose=require("mongoose")
require("dotenv").config()
const BaseSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.MONGODB_USER_COLLECTION,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    balance:{
        type:Number,
        default:0
    }
},{timestamps:true})
const Vendor=mongoose.model(process.env.VENDOR_COLLECTION,BaseSchema)
module.exports=Vendor