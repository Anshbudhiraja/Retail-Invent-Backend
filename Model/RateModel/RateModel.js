const mongoose = require("mongoose")
require("dotenv").config()
const BaseSchema= new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.MONGODB_USER_COLLECTION,
        required:true,
    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.PRODUCT_COLLECTION,
        required:true,
    },
    vendorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.VENDOR_COLLECTION,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now
    },
    message:{
        type:String,
        default:null
    },
    quantity: { 
        type: Number,
        default:0
    },
    costPerUnit: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    otherCharges: { type: Number, default: 0 },
    gst: {type:Number,required:true,enum:[0,5,12,18,28],default:0},
    gstCharges: { type: Number,required:true,default:0},
    vendorName: { type: String, required:true }
},{timestamps:true})
const Rate=mongoose.model(process.env.RATE_COLLECTION,BaseSchema)
module.exports=Rate