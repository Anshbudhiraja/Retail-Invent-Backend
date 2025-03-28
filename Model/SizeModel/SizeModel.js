const mongoose=require("mongoose")
require("dotenv").config()
const sizeSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.MONGODB_USER_COLLECTION,
        required:true,
    },
    subSubCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.SCHEMA_DEFINITION_COLLECTION,
        required:true
    },
    length:{
        type:Number,
        required:true
    },
    breadth:{
        type:Number,
        required:true
    }
}, { timestamps: true });
const Size = mongoose.model(process.env.SIZE_COLLECTION, sizeSchema);
module.exports=Size