const mongoose=require("mongoose")
require("dotenv").config()
const BaseSchema = new mongoose.Schema(
  {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      address:{
        type: String,
        required: true,
      },
      password:{
        type:String,
        default:null,
      },
      city:{
        type: String,
        required: true,
      },
      state:{
        type: String,
        required: true,
      },
      service:{
        type:Boolean,
        default:true,
      },
      role: {
        type: String,
        required: true,
        enum: ["Superadmin","Admin","Executive"],
      },
    },
    {timestamps:true ,discriminatorKey: "role", collection: process.env.MONGODB_USER_COLLECTION } // Add a discriminator key for role-based distinction
  );

const User = mongoose.model(process.env.MONGODB_USER_COLLECTION , BaseSchema);

//For Shopkeeper purpose
const AdminSchema = new mongoose.Schema({
  privacyPassword:{
    type:String,
    default:null,
  },
});

//For Executive purpose
const ExecutiveSchema = new mongoose.Schema({
  executiveof:{
    type:mongoose.Schema.Types.ObjectId,
    ref:process.env.MONGODB_USER_COLLECTION,
    required:true
  }
});

// Create discriminator models for Admin and Executive
const Admin = User.discriminator("Admin", AdminSchema);
const Executive = User.discriminator("Executive", ExecutiveSchema);
module.exports = {User,Admin,Executive}