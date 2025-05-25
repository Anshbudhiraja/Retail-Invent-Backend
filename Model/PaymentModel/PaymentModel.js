const mongoose=require("mongoose")
require("dotenv").config()

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: process.env.MONGODB_USER_COLLECTION, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: process.env.VENDOR_COLLECTION, required: true },
  amount: { type: Number, required: true },
  message: { type: String, default: null },
  method: { type: String, enum: ['cash', 'bank', 'upi'], required: true },
  date: { type: Date, default: Date.now }
},{timestamps:true});
const Payment=mongoose.model(process.env.PAYMENT_COLLECTION,paymentSchema)
module.exports=Payment