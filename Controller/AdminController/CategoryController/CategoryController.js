require("dotenv").config()
const {AllCategory} = require("../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../Responses/Responses");

const CategoryController={
    categories:async(req,resp)=>{
        try {
          const categories = await AllCategory.find({userId:req.user._id}).select("-image").lean();
          if(!categories || categories.length===0) return handleResponse(resp,404,"Your category list is empty")
          
          // Initialize an empty object to store structured data
          let categoryTree = {};
      
          // Process categories
          categories.forEach((cat) => {
            if (cat.categoryType === "MainCategory") {
              categoryTree[cat._id] = {
                id: cat._id,
                name: cat.name,
                subCategories: {},
              };
            }
          });
      
          categories.forEach((cat) => {
            if (cat.categoryType === "SubCategory" && cat.mainCategory) {
              if (categoryTree[cat.mainCategory]) {
                categoryTree[cat.mainCategory].subCategories[cat._id] = {
                  id: cat._id,
                  name: cat.name,
                  subSubCategories: {},
                };
              }
            }
          });
      
          categories.forEach((cat) => {
            if (cat.categoryType === "SubSubCategory" && cat.mainCategory && cat.subCategory) {
              if (categoryTree[cat.mainCategory] && categoryTree[cat.mainCategory].subCategories[cat.subCategory]) {
                categoryTree[cat.mainCategory].subCategories[cat.subCategory].subSubCategories[cat._id] = {
                  id: cat._id,
                  name: cat.name,
                  schemaId: cat.schemaId || null
                };
              }
            }
          });
          return handleResponse(resp,202,"Categories fetched successfully",categoryTree)
        } catch (error) {
          return handleError(resp,error)
        }
    }
}
module.exports=CategoryController