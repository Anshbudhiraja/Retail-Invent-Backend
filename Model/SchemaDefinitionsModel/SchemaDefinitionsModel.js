const mongoose=require("mongoose")
require("dotenv").config()
const schemaDefinitionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.MONGODB_USER_COLLECTION,
        required:true,
    },
    fields: { type: Array, required: true },
}, { timestamps: true });
const SchemaDefinition = mongoose.model(process.env.SCHEMA_DEFINITION_COLLECTION, schemaDefinitionSchema);
module.exports=SchemaDefinition