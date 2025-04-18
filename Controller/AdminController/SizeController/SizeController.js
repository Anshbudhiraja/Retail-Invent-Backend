const mongoose=require("mongoose")
require("dotenv").config()
const { SubSubCategory } = require("../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../Responses/Responses");
const Size = require("../../../Model/SizeModel/SizeModel");

const SizeController={
    addSizes:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
          const {length,breadth} =req.body
          if(!length) return handleResponse(resp,400,"Length is required")
          if(!breadth) return handleResponse(resp,400,"Breadth is required")
          if(length<=0 || breadth<=0) return handleResponse(resp,400,"Invalid Length and Breadth")
          
          const existingSubSubCategory = await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          if(!existingSubSubCategory.hasSize) return handleResponse(resp,400,"This category does not have size permission.")
          
          const existingSize = await Size.findOne({length:parseFloat(length),breadth:parseFloat(breadth),userId:req.user._id,subSubCategory:existingSubSubCategory._id})
          if(existingSize) return handleResponse(resp,400,"This size is already exists in this category!")
            
          const newSize=new Size({userId:req.user._id,subSubCategory:existingSubSubCategory._id,
            length:parseFloat(length),breadth:parseFloat(breadth)
          })
          await newSize.save()
          return handleResponse(resp,201,"New Size updated!")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    getAllSizes:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
          const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          
          if(!existingSubSubCategory.hasSize) return handleResponse(resp,400,"This category does not have any sizes")
          const result = await Size.find({userId:req.user._id,subSubCategory:existingSubSubCategory._id})
          if(!result || result.length===0) return handleResponse(resp,400,"You have not created any sizes yet!")
          return handleResponse(resp,202,"Sizes fetched successfully",result)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteSize:async(req,resp)=>{
        try {
          const {sizeId} = req.params
          if(!sizeId || !mongoose.isValidObjectId(sizeId)) return handleResponse(resp,400,"Invalid Size Id")
          
          const existingSize = await Size.findOne({_id:sizeId,userId:req.user._id})
          if(!existingSize) return handleResponse(resp,400,"This size is not found in your list")
          
          await Size.deleteOne({_id:existingSize._id,userId:req.user._id,subSubCategory:existingSize.subSubCategory})
          return handleResponse(resp,202,"Size deleted successfully!")
        } catch (error) {
          return handleError(resp,error)
        }
      }
}
module.exports=SizeController