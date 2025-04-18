const mongoose=require("mongoose")
require("dotenv").config()
const { SubSubCategory } = require("../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../Responses/Responses");
const SchemaDefinition = require("../../../Model/SchemaDefinitionsModel/SchemaDefinitionsModel");
const Product = require("../../../Model/ProductModel/ProductModel");
const { StockHistory } = require("../../../Model/StockHistoryModel/StockHistoryModel");

const validateProductInfo=(object,fields)=>{
    const objectKeys=Object.keys(object)
    const fieldKeys=fields.map(field=>field.name)
  
    for (const key of fieldKeys) {
      if (object[key] === null || object[key] === '') return "The key "+key+" is missing or empty."
    }
  
    for (const key of objectKeys) {
      if (!fieldKeys.includes(key)) return "The key "+key+" is not declared in the Variants."
    }
    return null;
}
const ProductController={
    addProduct:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
          const {name,price,description,options,size}=req.body
      
          if(!name) return handleResponse(resp,404,"Product Name is required")
          if(!price) return handleResponse(resp,404,"Product Price is required") 
          if(price<0) return handleResponse(resp,400,"Product Price is Invalid")
      
          const existingSubSubCategory = await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          
          if(existingSubSubCategory.hasSize){
            if(!size) return handleResponse(resp,400,"Size is required")
            if(Object.keys(size).length!==2) return handleResponse(resp,400,"Invalid Size Parameters")
            if(!size.length || !size.breadth) return handleResponse(resp,400,"Length and Breadth are required")
            if(size.length<=0 || size.breadth<=0) return handleResponse(resp,400,"Invalid Length and Breadth")
            size.length=parseFloat(size.length)
            size.breadth=parseFloat(size.breadth)
          }
      
          if(existingSubSubCategory.schemaId && options && Object.keys(options).length>0){
            // finding schema from collection
            const existingSchema=await SchemaDefinition.findOne({_id:existingSubSubCategory.schemaId,userId:req.user._id})
            if(!existingSchema || !existingSchema.fields) return handleResponse(resp,400,"Variants of this category are not exists")
      
            // fields present in database, now checking options
            // validating options from saved schema fields
            const validationError= validateProductInfo(options,existingSchema.fields)
            if(validationError) return handleResponse(resp,400,validationError)
            // checking field values if any
            const valuesError=[]
            const fields=existingSchema.fields
            for(const index in fields){
              if(fields[index].values){
                const key=fields[index].name
                const values=fields[index].values
                if(options[key] && !values.includes(options[key])) valuesError.push({index,key,message:`The ${options[key]} value you have entered for ${key} option is not declared in your default values.`})
              }
            }
            if(valuesError.length>0) return handleResponse(resp,400,"Values not matched to default values",valuesError)
      
            if(existingSubSubCategory.hasSize){
              const newProduct= new Product({
                name,price,description,subSubCategory,size,options,userId:req.user._id
              })
              await newProduct.save()
              return handleResponse(resp,201,"Product saved successfully",newProduct)  
            }
            const newProduct= new Product({
              name,price,description,subSubCategory,options,userId:req.user._id
            })
            await newProduct.save()
            return handleResponse(resp,201,"Product saved successfully",newProduct)
          }
      
          // here if fields not present in database
          if(existingSubSubCategory.hasSize){
            const newProduct= new Product({
              name,price,description,size,subSubCategory,userId:req.user._id
            })
            await newProduct.save()
            return handleResponse(resp,201,"Product saved successfully",newProduct)
          }
          const newProduct= new Product({
            name,price,description,subSubCategory,userId:req.user._id
          })
          await newProduct.save()
          return handleResponse(resp,201,"Product saved successfully",newProduct)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    getAllProducts:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
          const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          
          const allProducts=await Product.find({subSubCategory,userId:req.user._id})
          if(!allProducts || allProducts.length===0) return handleResponse(resp,404,"Product list is empty")
          return handleResponse(resp,202,"All Products fetched successfully",allProducts)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteProduct:async(req,resp)=>{
        try {
          const {productId} = req.params
          if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,404,"Invalid Product Id")
      
          const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
          if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list.")
      
          await Product.deleteOne({_id:productId,userId:req.user._id})
          await StockHistory.deleteMany({productId,userId:req.user._id})
          return handleResponse(resp,202,"Product Deleted Successfully")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteAllProducts:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
          const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          
          const deletedProducts=await Product.deleteMany({subSubCategory,userId:req.user._id})
          await StockHistory.deleteMany({subSubCategory,userId:req.user._id})
          return handleResponse(resp,202,`${deletedProducts.deletedCount} Products deleted successfully`)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    updateProduct:async(req,resp)=>{
        try {
          const {subSubCategory,productId} = req.params
      
          const {name,price,description,size,options} = req.body
      
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
          if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
          
          if(!name || !price) return handleResponse(resp,400,"Product Name and Price is required")
          if(price<0) return handleResponse(resp,400,"Product Price is Invalid")
      
          const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
          
          if(existingSubSubCategory.hasSize){
            if(!size) return handleResponse(resp,400,"Size is required")
            if(Object.keys(size).length!==2) return handleResponse(resp,400,"Invalid Size Parameters")
            if(!size.length || !size.breadth) return handleResponse(resp,400,"Length and Breadth are required")
            if(size.length<=0 || size.breadth<=0) return handleResponse(resp,400,"Invalid Length and Breadth")
            size.length=parseFloat(size.length)
            size.breadth=parseFloat(size.breadth)
          }
      
          const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
          if(!existingProduct) return handleResponse(resp,404,"This product is not available in your list")
      
          if(existingSubSubCategory.schemaId && options && Object.keys(options).length>0){
      
            const existingSchema=await SchemaDefinition.findOne({_id:existingSubSubCategory.schemaId,userId:req.user._id})
            if(!existingSchema || !existingSchema.fields) return handleResponse(resp,400,"Variants of this category are not exists")
            
            const validationError= validateProductInfo(options,existingSchema.fields)
            if(validationError) return handleResponse(resp,400,validationError)
            
            const valuesError=[]
            const fields=existingSchema.fields
            for(const index in fields){
              if(fields[index].values){
                const key=fields[index].name
                const values=fields[index].values
                if(options[key] && !values.includes(options[key])) valuesError.push({index,key,message:`The ${options[key]} value you have entered for ${key} option is not declared in your default values.`})
              }
            }
            if(valuesError.length>0) return handleResponse(resp,400,"Values not matched to default values",valuesError)
            
            existingProduct.name=name
            existingProduct.price=price
            if(description) existingProduct.description=description
            existingProduct.options=options
            if(existingSubSubCategory.hasSize) existingProduct.size=size
            existingProduct.markModified("options")
            await existingProduct.save()
            return handleResponse(resp,202,"Product updated successfully")
          }
          
          existingProduct.name=name
          existingProduct.price=price
          if(description) existingProduct.description=description
          if(existingSubSubCategory.hasSize) existingProduct.size=size
          existingProduct.options=null
          existingProduct.markModified("options")
          await existingProduct.save()
          return handleResponse(resp,202,"Product updated successfully")
        } catch (error) {
          return handleError(resp,error)
        }
      }
}
module.exports=ProductController