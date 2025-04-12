const mongoose=require("mongoose")
require("dotenv").config()
const BaseSchema = new mongoose.Schema({
      userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.MONGODB_USER_COLLECTION,
        required:true
      },
      name: {
        type: String,
        required: true,
      },
      image:{
        type:String,
        default:null
      },
      categoryType:{
        type:String,
        required:true,
        enum:["MainCategory","SubCategory","SubSubCategory"]
      }
},{timestamps:true , discriminatorKey: "categoryType", collection: process.env.CATEGORY_COLLECTION});
const AllCategory = mongoose.model(process.env.CATEGORY_COLLECTION , BaseSchema);

const MainCategorySchema = new mongoose.Schema({
    
});

const SubCategorySchema = new mongoose.Schema({
    mainCategory:{
      type:mongoose.Schema.Types.ObjectId,
      ref:process.env.CATEGORY_COLLECTION,
      required:true,
    }
});

const SubSubCategorySchema = new mongoose.Schema({
  mainCategory:{
    type:mongoose.Schema.Types.ObjectId,
    ref:process.env.CATEGORY_COLLECTION,
    required:true,
  },
  subCategory:{
    type:mongoose.Schema.Types.ObjectId,
    ref:process.env.CATEGORY_COLLECTION,
    required:true,
  },
  schemaId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:process.env.SCHEMA_DEFINITION_COLLECTION,
    default:null,
  },
  hasSize:{
    type:Boolean,
    default:false
  }
});

const MainCategory = AllCategory.discriminator("MainCategory", MainCategorySchema);
const SubCategory = AllCategory.discriminator("SubCategory", SubCategorySchema);
const SubSubCategory = AllCategory.discriminator("SubSubCategory", SubSubCategorySchema);
module.exports = {AllCategory,MainCategory,SubCategory,SubSubCategory}