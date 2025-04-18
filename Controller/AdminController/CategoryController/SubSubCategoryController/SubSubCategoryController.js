const mongoose=require("mongoose")
const fs=require("fs")
require("dotenv").config()
const {SubCategory,SubSubCategory} = require("../../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../../Responses/Responses");
const Product = require("../../../../Model/ProductModel/ProductModel");

const SubSubCategoryController={
    createSubSubCategory:async (req, resp) => {
        const userId=req.user._id
        try {
          const { name,isSize } = req.body;
          const { subCategory } = req.params
      
          if (!name) {
            if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if name is missing
            return handleResponse(resp, 404, "Category Name is required");
          }
          if(!subCategory){
            if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
            return handleResponse(resp, 404, "Sub Category Id is required");
          }
          if(!mongoose.isValidObjectId(subCategory)){
            if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
            return handleResponse(resp, 400, "Sub Category Id is invalid");
          }
          if (isSize && typeof JSON.parse(isSize) !== 'boolean'){
            if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
            return handleResponse(resp, 400, "Invalid Size Criteria");
          }
      
          const existingSubCategory = await SubCategory.findOne({ _id:subCategory,userId }).select("-image");
          if (!existingSubCategory) {
            if(req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
            return handleResponse(resp, 405, "The Sub Category of this is not exists in your list");
          }
      
          // Check if category already exists
          const existingSubSubCategory = await SubSubCategory.findOne({ name,subCategory:existingSubCategory._id,mainCategory:existingSubCategory.mainCategory,userId });
          if (existingSubSubCategory) {
            if(req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
            return handleResponse(resp, 405, "This Category already exists in your list");
          }
      
          if (req.file){
            const newCategory = new SubSubCategory({
              name,
              image: `./uploads/Category/SubSubCategory/${userId}/${req.file.filename}`, 
              subCategory:existingSubCategory._id,
              mainCategory:existingSubCategory.mainCategory,
              userId,
              hasSize:isSize
            });
        
            await newCategory.save();
            return handleResponse(resp, 201, `Category of ${existingSubCategory?.name} created successfully`, newCategory);
          }
          const newCategory = new SubSubCategory({
            name,
            subCategory:existingSubCategory._id,
            mainCategory:existingSubCategory.mainCategory,
            userId,
            hasSize:isSize
          });
      
          await newCategory.save();
          return handleResponse(resp, 201, `Category of ${existingSubCategory?.name} created successfully`, newCategory);
        } catch (error) {
          if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete image if an error occurs
          return handleError(resp, error);
        }
      },
    getAllSubSubCategory:async(req,resp)=>{
        try {
          const {subCategory}=req.params
          if(!subCategory || !mongoose.isValidObjectId(subCategory)) return handleResponse(resp,400,"Invalid Sub Category Id")
          
          const existingSubCategory=await SubCategory.findOne({_id:subCategory,userId:req.user._id}).select("-image")
          if(!existingSubCategory) return handleResponse(resp,404,"This SubCategory is not exists in your list")
      
          const result=await SubSubCategory.find({subCategory,userId:req.user._id})
          if(result.length===0) return handleResponse(resp,404,"Category List is empty")
          return handleResponse(resp,202,"All Categories fetched successfully",result)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    getSubSubCategory:async(req,resp)=>{
        try {
          const {subsubCategory}=req.params
          if(!subsubCategory || !mongoose.isValidObjectId(subsubCategory)) return handleResponse(resp,400,"Invalid Sub Sub Category Id")
          
          const result=await SubSubCategory.findOne({_id:subsubCategory,userId:req.user._id}).select("-image -subCategory -mainCategory")
          if(!result || Object.keys(result).length===0) return handleResponse(resp,404,"Category is not found")
          return handleResponse(resp,202,"Category fetched successfully",result)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteSubSubCategory:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
          const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          
          await Product.deleteMany({subSubCategory,userId:req.user._id})
          await StockHistory.deleteMany({subSubCategory,userId:req.user._id})
          await SubSubCategory.deleteOne({_id:subSubCategory,userId:req.user._id})
          return handleResponse(resp,202,"This Category Deleted Successfully!")
        } catch (error) {
          return handleError(resp,error)
        }
      }
}
module.exports=SubSubCategoryController