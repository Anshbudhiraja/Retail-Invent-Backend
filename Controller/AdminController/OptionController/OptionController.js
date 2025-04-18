const mongoose=require("mongoose")
require("dotenv").config()
const { SubSubCategory } = require("../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../Responses/Responses");
const SchemaDefinition = require("../../../Model/SchemaDefinitionsModel/SchemaDefinitionsModel");
const Product = require("../../../Model/ProductModel/ProductModel");

const validateObjectKeys=(object)=>{
    if(!object) return "Options are required"
  
    const objectKeys=Object.keys(object)
    const allowedkeys=["name","values"]
  
    if(objectKeys.length===0) return "Options are required"
  
    for(const key of objectKeys){
      if(!allowedkeys.includes(key)) return "Extra Options are not allowed"
    }
  
    if(!object.name || object.name==="" || object.name===null) return "Option name is required"
    
    if(object.values){
      if(!Array.isArray(object.values) || object.values.length===0) return "Default Values are required."
      if(object.values.length>10) return "Only 10 values are allowed!"
      if(object.values.some(item => !item || typeof item !== "string")) return "Default values are invalid"
      const uniqueValues = new Set(object.values);
      if(uniqueValues.size !== object.values.length) return "Duplicate values are not allowed.";
    }
    
    return null;
  }
  const validateDuplicateValues=(array)=>{
    const seen = new Set();
      for(const obj of array){
        const value = obj.name
        if(seen.has(value)) return true;
        seen.add(value);
      }
    return false; 
  }
  const validateConstantFields=(array,schema)=>{
    const schemaKeys = Object.keys(schema.paths).filter((key) => key !== '__v' && key !== '_id' && key !== 'createdAt' && key !== 'userId');
    for(const obj of array){
      if(schemaKeys.includes(obj.name)) return `The ${obj.name} Option is already created. You cannot create it.` 
    }
    return null;
  }
const OptionController={
    createOptions:async (req, resp) => {
        try {
            const {subSubCategory}=req.params
            if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")
      
            const { fields } = req.body;
            if(!fields || !Array.isArray(fields) || fields.length===0) return handleResponse(resp,404,"Options are required")
            if(fields.length>5) return handleResponse(resp,400,"You can only create 5 options")
              
            const errors=[]
            for(const index in fields){
              const validationError= validateObjectKeys(fields[index])
              if(validationError) errors.push({index,message:validationError})
            }
            if(errors.length>0) return handleResponse(resp,400,"Validation Errors Occured",errors)
            
            const duplicateValues= validateDuplicateValues(fields)
            if(duplicateValues) return handleResponse(resp,400,"Duplicate Options not accepted")
            
            const validateConstant = validateConstantFields(fields,Product.schema)
            if(validateConstant) return handleResponse(resp,400,validateConstant)
      
            const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
            if(!existingSubSubCategory) return handleResponse(resp,400,"This category does not exists in your list.")
            if(!existingSubSubCategory.schemaId){
              const newOptions = new SchemaDefinition({fields,userId:req.user._id})
              const result = await newOptions.save()
              existingSubSubCategory.schemaId=result._id
              await existingSubSubCategory.save()
              return handleResponse(resp,201,"New Options created successfully")
            }
            const existingSchema = await SchemaDefinition.findOne({_id:existingSubSubCategory.schemaId,userId:req.user._id})
            if(!existingSchema) return handleResponse(resp,400,"More Options are not created")
      
            const newfields=[...existingSchema.fields,...fields]
            if(newfields.length>5) return handleResponse(resp,400,"Options Limit Exceed!")
      
            const duplicateFields= validateDuplicateValues(newfields)
            if(duplicateFields) return handleResponse(resp,400,"You cannot create duplicate Options")
      
            existingSchema.fields=newfields
            await existingSchema.save()
            return handleResponse(resp,201,"New Options created successfully")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    getAllOptions:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,404,"Invalid Category Id")
          
          const existingSubSubCategory = await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list")
      
          if(existingSubSubCategory.schemaId===null || !mongoose.isValidObjectId(existingSubSubCategory.schemaId)){
            return handleResponse(resp,200,"Options for this Category are not created yet!")
          }
          const existingSchema=await SchemaDefinition.findOne({_id:existingSubSubCategory.schemaId,userId:req.user._id})
          if(!existingSchema) return handleResponse(resp,200,"Options for this Category are not present in your list.")
          
          return handleResponse(resp,202,"Options loaded successfully",existingSchema.fields)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteOption:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,404,"Invalid Category Id")
          
          const {name} = req.body // option name
          if(!name) return handleResponse(resp,400,"Option name is required")
      
          const existingSubSubCategory = await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list")
      
          if(!existingSubSubCategory.schemaId) return handleResponse(resp,404,"This option is not present in the list")
            
          const existingSchema=await SchemaDefinition.findOne({_id:existingSubSubCategory.schemaId,userId:req.user._id})
          if(!existingSchema) return handleResponse(resp,404,"This option is not present in the list")
            
          if(!existingSchema.fields.some(field => field.name === name)) return handleResponse(resp,404,"This option is not present in the list")
          
          if(existingSchema.fields.length===1){
           await SchemaDefinition.deleteOne({_id:existingSchema._id,userId:req.user._id})
           existingSubSubCategory.schemaId=null
           await existingSubSubCategory.save()
           return handleResponse(resp,202,"Option deleted successfully!")
          }
          existingSchema.fields = existingSchema.fields.filter(field => field.name !== name);
          await existingSchema.save()
          return handleResponse(resp,202,"Options deleted successfully")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteAllOptions:async(req,resp)=>{
        try {
          const {subSubCategory}=req.params
          if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,404,"Invalid Category Id")
      
          const existingSubSubCategory = await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
          if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list")
      
          if(!existingSubSubCategory.schemaId) return handleResponse(resp,404,"The options are not present in the list")
            
          const existingSchema=await SchemaDefinition.findOne({_id:existingSubSubCategory.schemaId,userId:req.user._id})
          if(!existingSchema) return handleResponse(resp,404,"The options are not present in the list")
            
          await SchemaDefinition.deleteOne({_id:existingSchema._id,userId:req.user._id})
          existingSubSubCategory.schemaId=null
          await existingSubSubCategory.save()
          return handleResponse(resp,202,"Options deleted successfully!")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    updateOptionValues:async(req,resp)=>{
        try {
          const {schemaId} = req.params
          if(!schemaId || !mongoose.isValidObjectId(schemaId)) return handleResponse(resp,400,"Invalid Schema Id")
          
          const {name,values} = req.body
          if(!name) return handleResponse(resp,400,"Option Name is required")
          if(!values) return handleResponse(resp,400,"Option values are required")
      
          if(!Array.isArray(values) || values.length===0) return handleResponse(resp,400,"Default Values are required.")
          if(values.length>10) return handleResponse(resp,400,"Only 10 values are allowed!")
          if(values.some(item => !item || typeof item !== "string")) return handleResponse(resp,400,"Default values are invalid")
          const uniqueValues = new Set(values);
          if(uniqueValues.size !== values.length) return handleResponse(resp,400,"Duplicate values are not allowed.")
      
          const existingSchema = await SchemaDefinition.findOne({_id:schemaId,userId:req.user._id})
          if(!existingSchema) return handleResponse(resp,400,"This schema is not available in your list")
          
          const existingOption = existingSchema.fields.find(field => field.name === name);
          if(!existingOption) return handleResponse(resp,404,"This option is not present in the list")
          if(!existingOption.values) return handleResponse(resp,404,"This option does not contain values")
          existingOption.values=values
          existingSchema.markModified('fields');
          await existingSchema.save()
          return handleResponse(resp,202,"Option values updated!")
        } catch (error) {
          return handleError(resp,error)
        }
      }
}
module.exports=OptionController