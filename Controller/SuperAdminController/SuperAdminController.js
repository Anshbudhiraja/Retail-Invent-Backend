const mongoose=require("mongoose")
require("dotenv").config()
const {handleResponse,handleError}=require("../../Responses/Responses");
const { Admin, User, Executive } = require("../../Model/UserModel/UserModel");
const { generateOtp, verifyOtp } = require("../../Services/OtpService/OtpService");
const { otpToCreateAccount } = require("../../Services/EmailService/EmailService");

const SuperAdminController={
    verifyuser:async (req, resp) => {
        try {
          const { name, phone, email, address, city, state,role,executiveof } = req.body;
      
          if (!name || !phone || !email || !city || city==="None" || !address || !state || state==="None" || !role) return handleResponse(resp,404,"Field are required")
      
          const userRoleChecker=["Admin","Executive"]
          if(!userRoleChecker.includes(role)) return handleResponse(resp,404,"This role is not exists")
      
          const existinguser = await User.findOne({ email });
          if (existinguser) return handleResponse(resp,400,"Account already exists")
      
          if(role==="Executive"){
            if(!executiveof) return handleResponse(resp,404,"Select the Admin")
            if(!mongoose.isValidObjectId(executiveof)) return handleResponse(resp,401,"Invalid Admin id")
            const existingAdmin=await Admin.findOne({_id:executiveof})
            if(!existingAdmin) return handleResponse(resp,404,"The Admin belong to this id is not exists")
          }      
          const otp = generateOtp(email);
          return await otpToCreateAccount(resp,name,email, otp);
        } catch (error) {
          return handleError(resp,error)
        }
    },
    createuser:async (req, resp) => {
        try {
          const { name, phone, email, address, city, state,role, otp,executiveof } =req.body;
      
          if (!name || !phone || !email || !address || !city || city==="None" || !state || state==="None" ||!role) return handleResponse(resp,404,"Field are required")
      
          if (!otp) return handleResponse(resp,404,"Enter the otp");
      
          const userRoleChecker=["Admin","Executive"]
          if(!userRoleChecker.includes(role)) return handleResponse(resp,404,"This role is not exists")
      
          const existinguser = await User.findOne({ email });
          if (existinguser) return handleResponse(resp,400,"Account already exists")
      
          if(role==="Executive"){
            if(!executiveof) return handleResponse(resp,404,"Select the Admin")
            if(!mongoose.isValidObjectId(executiveof)) return handleResponse(resp,401,"Invalid Admin id")
            const existingAdmin=await Admin.findOne({_id:executiveof})
            if(!existingAdmin) return handleResponse(resp,404,"The Admin belong to this id is not exists")
          }     
      
          const response = verifyOtp(email, otp);
          if (!response.status) return handleResponse(resp,404,response.message);
      
          if(role==="Admin"){
          await Admin.create({name,phone,email,address,city,state});
          return handleResponse(resp,201,"Admin created successfully");
          }
          if(role==="Executive"){
          await Executive.create({name,phone,email,address,city,state,executiveof});
          return handleResponse(resp,201,"Executive created successfully"); 
          }
        } catch (error) {
          return handleError(resp,error)
        }
    },
    getallusers:async(req,resp)=>{
        try {
          const users = await User.aggregate([{ $match: { role: "Admin" } },{ $lookup: {from: process.env.MONGODB_USER_COLLECTION,localField: "_id",foreignField: "executiveof",as: "executives"}}, {$project: {password: 0, privacyPassword: 0, "executives.password": 0}}]).exec();
          if(!users || users.length===0) return handleResponse(resp,400,"No users found")
          return handleResponse(resp,202,"All Users fetched successfully",users)
        } catch (error) {
          return handleError(resp,error)
        }
    },
    enableUser:async(req,resp)=>{
        try {
          const {userId} = req.params
          if(!userId || !mongoose.isValidObjectId(userId)) return handleResponse(resp,400,"Invalid User Id")
          
          const existingUser = await User.findById(userId).select("-password")
          if(!existingUser) return handleResponse(resp,400,"This user is not exists in your list")
          
          if(existingUser.service) return handleResponse(resp,400,"Service is already enabled")
          existingUser.service=true
          await existingUser.save()
          return handleResponse(resp,202,"User Service Enabled")
        } catch (error) {
          return handleError(resp,error)
        }
    },
    disableUser:async(req,resp)=>{
        try {
          const {userId} = req.params
          if(!userId || !mongoose.isValidObjectId(userId)) return handleResponse(resp,400,"Invalid User Id")
          
          const existingUser = await User.findById(userId).select("-password")
          if(!existingUser) return handleResponse(resp,400,"This user is not exists in your list")
          
          if(!existingUser.service) return handleResponse(resp,400,"Service is already disabled")
          existingUser.service=false
          await existingUser.save()
          return handleResponse(resp,202,"User Service Disabled")
        } catch (error) {
          return handleError(resp,error)
        }
    }
}
module.exports=SuperAdminController