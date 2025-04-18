const jwt=require("jsonwebtoken");
const bcrypt = require("bcrypt")
require("dotenv").config()
const {handleResponse,handleError}=require("../../Responses/Responses");
const { Admin } = require("../../Model/UserModel/UserModel");

const AdminController={
    createPrivacyPassword:async(req,resp)=>{
        try {
          const {password,confirmPassword}=req.body
          if(!password) return handleResponse(resp,400,"Password is required")
          if(!confirmPassword) return handleResponse(resp,400,"Confirm Password is required")
          if(password!==confirmPassword) return handleResponse(resp,400,"Password does not matched")
          const existingAdmin = await Admin.findById(req.user._id).select("-password -role")
          if(!existingAdmin) return handleResponse(resp,401,"Unauthorised User")
          if(existingAdmin.privacyPassword) return handleResponse(resp,400,"Privacy Password already exists")
          const salt=await bcrypt.genSalt(10)
          const encryptedpassword=await bcrypt.hash(password,salt)
          existingAdmin.privacyPassword=encryptedpassword
          await existingAdmin.save()
          return handleResponse(resp,202,"Privacy Password created Successfully")
        } catch (error) {
          return handleError(resp,error)
        }
      },
    fetchPrivacyPassword:async(req,resp)=>{
        try {
          const existingUser= await Admin.findById(req.user._id).select("-password -role")
          if(existingUser.privacyPassword) return handleResponse(resp,202,"Privacy Password already exists",{status:true})
          return handleResponse(resp,202,"Privacy Password does not exists",{status:false})
        } catch (error) {
          return handleError(resp,error)
        }
      },
    checkPrivacyPassword:async(req,resp)=>{
        try {
          const {password} = req.body
          if(!password) return handleResponse(resp,400,"Password is required")
          const existingUser= await Admin.findById(req.user._id).select("-password -role")
          if(!existingUser.privacyPassword) return handleResponse(resp,404,"Privacy Password is not found")
          const result = await bcrypt.compare(password,existingUser.privacyPassword)
          if(!result) return handleResponse(resp,400,"Wrong Password")
          const payload={id:existingUser._id,privacy:true}
          const token = jwt.sign(payload,process.env.JSON_SECRET_KEY)
          return handleResponse(resp,202,"Password matched",{token:`Bearer ${token}`})
        } catch (error) {
          return handleError(resp,error)
        }
      },
    changeUserLoginPassword:async(req,resp)=>{
      try {
        const {currentPassword,newPassword,confirmPassword}=req.body
        if(!currentPassword) return handleResponse(resp,400,"Current Password is required")
        if(!newPassword) return handleResponse(resp,400,"New Password is required")
        if(!confirmPassword) return handleResponse(resp,400,"Confirm Password is required")
        
        if(currentPassword===newPassword) return handleResponse(resp,400,"Current and New Password cannot be same")
        if(newPassword!==confirmPassword) return handleResponse(resp,400,"New Password and confirm Password does not matched")
        
        const existingUser = await Admin.findById(req.user._id)
        if(!existingUser) return handleResponse(resp,401,"Unauthorized User")
        if(!existingUser.password) return handleResponse(resp,400,"Login Method is incorrect")
    
        const result = await bcrypt.compare(currentPassword,existingUser.password)
        if(!result) return handleResponse(resp,400,"Entered Current Password is incorrect")
        const salt=await bcrypt.genSalt(10)
        const encryptedpassword=await bcrypt.hash(newPassword,salt)
        existingUser.password=encryptedpassword
        await existingUser.save()
        return handleResponse(resp,202,"Password Changed Successfully!")
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getUser:async(req,resp)=>{
      try {
        const {name,phone,email,address,city,state} = req.user
        return handleResponse(resp,202,"User fetched",{name,phone,email,address,city,state})
      } catch (error) {
        return handleError(resp,error)
      }
    }
}
module.exports=AdminController