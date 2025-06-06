const mongoose=require("mongoose")
require("dotenv").config()
const {handleResponse,handleError}=require("../../../Responses/Responses");
const Vendor = require("../../../Model/VendorModel/VendorModel");

const VendorController={
    createVendor:async(req,resp)=>{
        try {
          const {name}=req.body
      
          if(!name) return handleResponse(resp,404,"Vendor name is required")
          
          const existingVendor=await Vendor.findOne({name,userId:req.user._id})
          if(existingVendor) return handleResponse(resp,400,"Vendor related to this name already exists")
          
          const newVendor= new Vendor({name,userId:req.user._id})
          await newVendor.save()
          return handleResponse(resp,201,"Vendor created successfully")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    getVendor:async (req,resp)=> {
        try {
          const {vendorId}=req.params
          if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id")
      
          const existingVendor=await Vendor.findOne({_id:vendorId,userId:req.user._id})
          if(!existingVendor) return handleResponse(resp,400,"This vendor is not exists in your list.")
          return handleResponse(resp,202,"Vendor fetched successfully!",existingVendor)
          } catch (error) {
          return handleError(resp,error)
        }
      },
    getAllVendors:async(req,resp)=>{
        try {
          const allVendors=await Vendor.find({userId:req.user._id})
          if(!allVendors || allVendors.length===0) return handleResponse(resp,404,"Vendor list is empty")
          return handleResponse(resp,202,"All Vendor fetched successfully",allVendors)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteVendor:async(req,resp)=>{
        try {
          const {vendorId}=req.params
          if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,404,"Invalid Vendor Id")
      
          const existingVendor=await Vendor.findOne({_id:vendorId,userId:req.user._id})
          if(!existingVendor) return handleResponse(resp,404,"This vendor is not exists in your list.")
          
          const result=await Vendor.deleteOne({_id:vendorId,userId:req.user._id})
          return handleResponse(resp,202,"Vendor deleted successfully!")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    deleteAllVendors:async(req,resp)=>{
        try {
          const result=await Vendor.deleteMany({userId:req.user._id})
          return handleResponse(resp,202,`${result.deletedCount} Vendors deleted!`)
        } catch (error) {
          return handleError(resp,error)
        }
      },
    updateVendor:async(req,resp)=>{
        try {
          const {vendorId}=req.params
          const {name}=req.body
      
          if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,404,"Invalid Vendor Id")
          if(!name) return handleResponse(resp,404,"Vendor name is required")
      
          const existingVendor=await Vendor.findOne({_id:vendorId,userId:req.user._id})
          if(!existingVendor) return handleResponse(resp,404,"This vendor is not exists in your list.")
         
          if(name !== existingVendor.name) {
            const existingUser = await Vendor.findOne({ name ,userId:req.user._id});
            if(existingUser) return handleResponse(resp,400,"Vendor already exists with this name.")
          }
      
          existingVendor.name=name
          await existingVendor.save()
          return handleResponse(resp,202,"Vendor updated successfully!")
        } catch (error) {
          return handleError(resp,error)
        }
      }
}
module.exports=VendorController