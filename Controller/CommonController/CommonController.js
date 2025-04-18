const jwt=require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config()
const { handleResponse, handleError } = require("../../Responses/Responses");
const { User } = require("../../Model/UserModel/UserModel");
const { generateOtp, deleteOtp, verifyOtp } = require("../../Services/OtpService/OtpService");
const {otpToSignIn, otpToResetAccount} = require("../../Services/EmailService/EmailService");
const CommonController={
    emailLogin:async(req,resp)=>{
        const {email} = req.body
      try {
        if(!email) return handleResponse(resp,400,"Email is required",{status:false})
        const existingUser = await User.findOne({email})
        if(!existingUser) return handleResponse(resp,401,"Email is invalid",{status:false})
        if(!existingUser.service) return handleResponse(resp,401,"Your service is disabled",{status:false})
        if(existingUser.password){
          return handleResponse(resp,202,"Password is required",{status:true,required:"password"})
        }
        const otp=generateOtp(email)
        return await otpToSignIn(resp,existingUser.name,email,otp)
      } catch (error) {
        deleteOtp(email)
        return handleError(resp,error)
      }
    },
    verifyLogin:async(req,resp)=>{
        const {email,otp} = req.body
      try {
        if(!email) return handleResponse(resp,400,"Email is required")
        if(!otp) return handleResponse(resp,400,"Otp is required")
        const existingUser = await User.findOne({email})
        if(!existingUser) return handleResponse(resp,400,"Email is invalid")
        if(existingUser.password) return handleResponse(resp,401,"Invalid Login. Password is required",{role:"/"})
        const result=verifyOtp(email,otp)
      
        if(!result.status) return handleResponse(resp,400,result.message)
        const payload={id:existingUser._id}
        const token = jwt.sign(payload,process.env.JSON_SECRET_KEY)
        return handleResponse(resp,202,"Login Successfully",{token:"Bearer "+token,role:`/${existingUser.role}`})
      } catch (error) {
        deleteOtp(email)
        return handleError(resp,error)
      }
    },
    checkUserPassword:async(req,resp)=>{
        try {
          const authHeader = req.header("Authorization");
          if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required",{status:false});
        
          const token = authHeader.split(" ")[1];
          const { id } = jwt.verify(token, process.env.JSON_SECRET_KEY);
          if (!id) return handleResponse(resp, 401, "Invalid token",{status:false});
        
          const user = await User.findById(id)
          if (!user) return handleResponse(resp, 401, "Unauthorized user",{status:false});
          if (user.password) return handleResponse(resp,202,"User is valid",{status:true})
          return handleResponse(resp,202,"User is valid",{status:true,required:"password"})
        } catch (error) {
          return handleError(resp,error)
        }
    },
    createPassword:async(req,resp)=>{
        try {
          const authHeader = req.header("Authorization");
          if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required",{status:false,navigate:"/"});
        
          const {password,confirmPassword} = req.body
          if(!password) return handleResponse(resp,400,"Password is required")
          if(!confirmPassword) return handleResponse(resp,400,"Confirm Password is required")
          if(password!==confirmPassword) return handleResponse(resp,400,"Password not matched")
      
          const token = authHeader.split(" ")[1];
          const { id } = jwt.verify(token, process.env.JSON_SECRET_KEY);
          if (!id) return handleResponse(resp, 401, "Invalid token",{status:false,navigate:"/"});
        
          const user = await User.findById(id)
          if (!user) return handleResponse(resp, 401, "Unauthorized user",{status:false,navigate:"/"});
          if (user.password) return handleResponse(resp,202,"Password already exists",{status:true,navigate:`/${user.role}`})
          const salt=await bcrypt.genSalt(10)
          const encryptedpassword=await bcrypt.hash(password,salt)
          user.password=encryptedpassword
          await user.save()
          return handleResponse(resp,202,"Password created successfully",{status:true,navigate:`/${user.role}`})
        } catch (error) {
          return handleError(resp,error)
        }
    },
    passwordLogin:async(req,resp) => {
        try {
          const { email, password } = req.body;
          if (!email) return handleResponse(resp,404,"Email is required");
          if (!password) return handleResponse(resp,404,"Password is required");
      
          const existingUser = await User.findOne({ email });
          if (!existingUser) return handleResponse(resp,400,"Invalid Email");
          if (!existingUser.password) return handleResponse(resp,401,"Invalid Login",{role:"/"})
          const result = await bcrypt.compare(password,existingUser.password)
          if(!result) return handleResponse(resp,400,"Invalid Password")
          
          const payload={id:existingUser._id}
          const token = jwt.sign(payload,process.env.JSON_SECRET_KEY)
          return handleResponse(resp,202,"Login Successfully",{token:"Bearer "+token,role:`/${existingUser.role}`})
        } catch (error) {
          return handleError(resp,error);
        }
    },
    forgetUser:async(req,resp)=>{
        try {
          const {email} = req.body
          if(!email) return handleResponse(resp,400,"Email is required")
          
          const existingUser = await User.findOne({email}).select("-privacyPassword")
          if(!existingUser) return handleResponse(resp,400,"User related to this Email not exists")
          if(!existingUser.password) return handleResponse(resp,400,"OTP Login Method is set for this Account")
          const otp=generateOtp(email)
          return await otpToResetAccount(resp,existingUser.name,email,otp)
        } catch (error) {
          return handleError(resp,error)
        }
    },
    verifyForgetUser:async(req,resp)=>{
        const {email,otp} = req.body
        try {
          if(!email) return handleResponse(resp,400,"Email is required")
          if(!otp) return handleResponse(resp,400,"Otp is required")
      
          const existingUser = await User.findOne({email}).select("-privacyPassword")
          if(!existingUser) return handleResponse(resp,400,"User related to this Email not exists")
          if(!existingUser.password) return handleResponse(resp,400,"OTP Login Method is set for this Account")
          
          const response = verifyOtp(email, otp);
          if (!response.status) return handleResponse(resp,400,response.message);
          const payload={id:existingUser._id}
          const token = jwt.sign(payload,process.env.JSON_SECRET_KEY)
          return handleResponse(resp,202,"Otp verified. Create New Password for your Account",{token:"Bearer "+token})
        } catch (error) {
          deleteOtp(email)
          return handleError(resp,error)
        }
    },
    createForgetUserPassword:async(req,resp)=>{
        try {
          const authHeader = req.header("Authorization");
          if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required",{status:false,navigate:"/"});
        
          const {password,confirmPassword} = req.body
          if(!password) return handleResponse(resp,400,"Password is required")
          if(!confirmPassword) return handleResponse(resp,400,"Confirm Password is required")
          if(password!==confirmPassword) return handleResponse(resp,400,"Password not matched")
      
          const token = authHeader.split(" ")[1];
          const { id } = jwt.verify(token, process.env.JSON_SECRET_KEY);
          if (!id) return handleResponse(resp, 401, "Invalid token",{status:false,navigate:"/"});
        
          const user = await User.findById(id)
          if (!user) return handleResponse(resp, 401, "Unauthorized user",{status:false,navigate:"/"});
          if (!user.password) return handleResponse(resp,400,"Login Method is incorrect",{status:false,navigate:`/`})
          
          const result= await bcrypt.compare(password,user.password)
          if(result) return handleResponse(resp,400,"New Password cannot be same as last password")
      
          const salt=await bcrypt.genSalt(10)
          const encryptedpassword=await bcrypt.hash(password,salt)
          user.password=encryptedpassword
          await user.save()
          return handleResponse(resp,202,"Password changed successfully",{status:true,navigate:`/${user.role}`})
        } catch (error) {
          return handleError(resp,error)
        }
    }
}
module.exports=CommonController