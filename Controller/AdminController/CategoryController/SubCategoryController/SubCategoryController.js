const mongoose=require("mongoose")
const fs=require("fs")
const path=require("path")
require("dotenv").config()
const {MainCategory,SubCategory} = require("../../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../../Responses/Responses");

const SubCategoryController={
    createSubCategory:async (req, resp) => {
        const userId=req.user._id
        try {
          const { name } = req.body;
          const { mainCategory } = req.params;
          const filePath = req.file?path.join(__dirname, '..', 'uploads', 'Category', 'SubCategory', String(userId), req.file.filename):null;
          if (!name) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 404, "Category Name is required");
          }
          if(!mainCategory){
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 404, "Main Category id is required");
          }
          if(!mongoose.isValidObjectId(mainCategory)){
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 400, "Main Category id is invalid");
          }
      
          const existingMainCategory = await MainCategory.findOne({ _id:mainCategory,userId }).select("-image");
          if (!existingMainCategory) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 405, "The Main Category of this is not exists in your list");
          }
      
          // Check if category already exists
          const existingSubCategory = await SubCategory.findOne({ name,mainCategory:existingMainCategory._id,userId });
          if (existingSubCategory) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 405, "This Category already exists in your list");
          }
      
          if (req.file){
            const newCategory = new SubCategory({
              name,
              image: `./uploads/Category/SubCategory/${userId}/${req.file.filename}`, 
              mainCategory:existingMainCategory._id,
              userId
            });
        
            await newCategory.save();
            return handleResponse(resp, 201, `Category of ${existingMainCategory?.name} created successfully`, newCategory);
          }
          const newCategory = new SubCategory({
            name,
            mainCategory:existingMainCategory._id,
            userId
          });
      
          await newCategory.save();
          return handleResponse(resp, 201, `Category of ${existingMainCategory?.name} created successfully`, newCategory);
      
        } catch (error) {
          const filePath=req.file?path.join(__dirname, '..', 'uploads', 'Category', 'SubCategory', String(userId), req.file.filename):null;
          if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return handleError(resp, error);
        }
      },
    getAllSubCategory:async(req,resp)=>{
        try {
          const {mainCategory}=req.params
          if(!mainCategory || !mongoose.isValidObjectId(mainCategory)) return handleResponse(resp,400,"Invalid Main Category Id")
          
          const existingMainCategory= await MainCategory.findOne({_id:mainCategory,userId:req.user._id}).select("-image")
          if(!existingMainCategory) return handleResponse(resp,404,"This category is not exists.")
      
          const result=await SubCategory.find({mainCategory,userId:req.user._id})
          if(result.length===0) return handleResponse(resp,404,"Category List is empty")
          return handleResponse(resp,202,"All Categories fetched successfully",result)
        } catch (error) {
          return handleError(resp,error)
        }
      }
}
module.exports=SubCategoryController