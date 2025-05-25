const fs=require("fs")
const path=require("path")
require("dotenv").config()
const { MainCategory } = require("../../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../../Responses/Responses");

const MainCategoryController={
    createMainCategory:async (req, resp) => {
        const userId=req.user._id
        try {
          const { name } = req.body;
      
          const filePath = req.file? path.join(__dirname, '..', 'uploads', 'Category', 'MainCategory', String(userId), req.file.filename):null;
          if (!name) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 404, "Category Name is required");
          }
      
          // Check if category already exists
          const existingMainCategory = await MainCategory.findOne({ name,userId });
          if (existingMainCategory) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return handleResponse(resp, 405, "This Category already exists in your list");
          }
      
          if (req.file){
            const newCategory = new MainCategory({
              name,
              image: `./uploads/Category/MainCategory/${userId}/${req.file.filename}`, 
              userId
            });
        
            await newCategory.save();
            return handleResponse(resp, 201, "Category created successfully", newCategory);
          }
          const newCategory = new MainCategory({
            name,
            userId
          });
      
          await newCategory.save();
          return handleResponse(resp, 201, "Category created successfully", newCategory);
      
        } catch (error) {
          const filePath=req.file?path.join(__dirname, '..', 'uploads', 'Category', 'MainCategory', String(userId), req.file.filename):null;
          if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return handleError(resp, error);
        }
    },
    getAllMainCategory:async(req,resp)=>{
        try {
          const result=await MainCategory.find({userId:req.user._id})
          if(result.length===0) return handleResponse(resp,404,"Category List is empty")
          return handleResponse(resp,202,"All Categories fetched successfully",result)
        } catch (error) {
          return handleError(resp,error)
        }
    }
}
module.exports=MainCategoryController