const mongoose=require("mongoose")
const express = require("express");
const jwt=require("jsonwebtoken");
const fs=require("fs")
const multer=require("multer")
const bcrypt = require("bcrypt")
require("dotenv").config()
const {AllCategory,MainCategory,SubCategory,SubSubCategory} = require("../Model/CategoryModel/CategoryModel");
const {superAdminChecker, adminChecker, adminPrivacyChecker} = require("../Middlewares/Checkuserdetails");
const {handleResponse,handleError}=require("../Responses/Responses");
const Vendor = require("../Model/VendorModel/VendorModel");
const SchemaDefinition = require("../Model/SchemaDefinitionsModel/SchemaDefinitionsModel");
const Product = require("../Model/ProductModel/ProductModel");
const { Purchase, Rate, StockHistory } = require("../Model/StockHistoryModel/StockHistoryModel");
const { Admin, User, Executive } = require("../Model/UserModel/UserModel");
const { generateOtp, deleteOtp, verifyOtp } = require("../Services/OtpService/OtpService");
const {otpToSignIn,otpToCreateAccount, otpToResetAccount} = require("../Services/EmailService/EmailService");
const Size = require("../Model/SizeModel/SizeModel");
const Routes = express.Router();

Routes.get("/HealthCheckApi", async (req, resp) =>handleResponse(resp,202,"Server Health is Okay"))
// user work
Routes.post("/emailLogin",async(req,resp)=>{
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
})
Routes.post("/verifyLogin",async(req,resp)=>{
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
})
Routes.get("/checkUserPassword",async(req,resp)=>{
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
})
Routes.put("/createPassword",async(req,resp)=>{
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
})
Routes.post("/passwordLogin",async(req,resp) => {
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
});
Routes.post("/forgetUser",async(req,resp)=>{
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
})
Routes.post("/verifyForgetUser",async(req,resp)=>{
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
})
Routes.put("/createForgetUserPassword",async(req,resp)=>{
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
})

// superadmin
Routes.post("/verifyuser",superAdminChecker,async (req, resp) => {
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
});
Routes.post("/createuser",superAdminChecker,async (req, resp) => {
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
});
Routes.get("/getallusers",superAdminChecker,async(req,resp)=>{
  try {
    const users = await User.aggregate([{ $match: { role: "Admin" } },{ $lookup: {from: process.env.MONGODB_USER_COLLECTION,localField: "_id",foreignField: "executiveof",as: "executives"}}, {$project: {password: 0, privacyPassword: 0, "executives.password": 0}}]).exec();
    if(!users || users.length===0) return handleResponse(resp,400,"No users found")
    return handleResponse(resp,202,"All Users fetched successfully",users)
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.put("/enableUser/:userId",superAdminChecker,async(req,resp)=>{
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
})
Routes.put("/disableUser/:userId",superAdminChecker,async(req,resp)=>{
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
})



// 1st level of category
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      fs.mkdir(`./uploads/Category/MainCategory/${req.user._id}/`,{recursive:true},(err)=>{
          if(err) return cb(err,null)
          else cb(null, `uploads/Category/MainCategory/${req.user._id}/`);
      })
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadMainCategory = multer({ storage: storage });
Routes.post("/createMainCategory",adminChecker,uploadMainCategory.single("image"), async (req, resp) => {
  const userId=req.user._id
  try {
    const { name } = req.body;

    if (!name) {
      if (req.file) fs.unlinkSync(`uploads/Category/MainCategory/${userId}/${req.file.filename}`); // Delete uploaded image if name is missing
      return handleResponse(resp, 404, "Category Name is required");
    }

    // Check if category already exists
    const existingMainCategory = await MainCategory.findOne({ name,userId });
    if (existingMainCategory) {
      if(req.file) fs.unlinkSync(`uploads/Category/MainCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
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
    if (req.file) fs.unlinkSync(`uploads/Category/MainCategory/${userId}/${req.file.filename}`); // Delete image if an error occurs
    return handleError(resp, error);
  }
});
Routes.get("/getAllMainCategory",adminChecker,async(req,resp)=>{
  try {
    const result=await MainCategory.find({userId:req.user._id})
    if(result.length===0) return handleResponse(resp,404,"Category List is empty")
    return handleResponse(resp,202,"All Categories fetched successfully",result)
  } catch (error) {
    return handleError(resp,error)
  }
})

// 2nd level of category
const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
      const userId=req.user._id
      fs.mkdir(`./uploads/Category/SubCategory/${userId}/`,{recursive:true},(err)=>{
          if(err) return cb(err,null)
          else cb(null, `uploads/Category/SubCategory/${userId}/`);
      })
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadSubCategory = multer({ storage: storage1 });
Routes.post("/createSubCategory/:mainCategory",adminChecker,uploadSubCategory.single("image"), async (req, resp) => {
  const userId=req.user._id
  try {
    const { name } = req.body;
    const { mainCategory } = req.params;

    if (!name) {
      if (req.file) fs.unlinkSync(`uploads/Category/SubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if name is missing
      return handleResponse(resp, 404, "Category Name is required");
    }
    if(!mainCategory){
      if (req.file) fs.unlinkSync(`uploads/Category/SubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
      return handleResponse(resp, 404, "Main Category id is required");
    }
    if(!mongoose.isValidObjectId(mainCategory)){
      if (req.file) fs.unlinkSync(`uploads/Category/SubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
      return handleResponse(resp, 400, "Main Category id is invalid");
    }

    const existingMainCategory = await MainCategory.findOne({ _id:mainCategory,userId }).select("-image");
    if (!existingMainCategory) {
      if(req.file) fs.unlinkSync(`uploads/Category/SubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
      return handleResponse(resp, 405, "The Main Category of this is not exists in your list");
    }

    // Check if category already exists
    const existingSubCategory = await SubCategory.findOne({ name,mainCategory:existingMainCategory._id,userId });
    if (existingSubCategory) {
      if(req.file) fs.unlinkSync(`uploads/Category/SubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
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
    if (req.file) fs.unlinkSync(`uploads/Category/SubCategory/${userId}/${req.file.filename}`); // Delete image if an error occurs
    return handleError(resp, error);
  }
});
Routes.get("/getAllSubCategory/:mainCategory",adminChecker,async(req,resp)=>{
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
})

// 3rd level of category
const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
      const userId=req.user._id
      fs.mkdir(`./uploads/Category/SubSubCategory/${userId}/`,{recursive:true},(err)=>{
          if(err) return cb(err,null)
          else cb(null, `uploads/Category/SubSubCategory/${userId}/`);
      })
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadSubSubCategory = multer({ storage: storage2 });
Routes.post("/createSubSubCategory/:subCategory",adminChecker,uploadSubSubCategory.single("image"), async (req, resp) => {
  const userId=req.user._id
  try {
    const { name,isSize } = req.body;
    const { subCategory } = req.params

    if (!name) {
      if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if name is missing
      return handleResponse(resp, 404, "Category Name is required");
    }
    if(!subCategory){
      if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
      return handleResponse(resp, 404, "Sub Category Id is required");
    }
    if(!mongoose.isValidObjectId(subCategory)){
      if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
      return handleResponse(resp, 400, "Sub Category Id is invalid");
    }
    if (isSize && typeof JSON.parse(isSize) !== 'boolean'){
      if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if parentCategory is missing
      return handleResponse(resp, 400, "Invalid Size Criteria");
    }

    const existingSubCategory = await SubCategory.findOne({ _id:subCategory,userId }).select("-image");
    if (!existingSubCategory) {
      if(req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
      return handleResponse(resp, 405, "The Sub Category of this is not exists in your list");
    }

    // Check if category already exists
    const existingSubSubCategory = await SubSubCategory.findOne({ name,subCategory:existingSubCategory._id,mainCategory:existingSubCategory.mainCategory,userId });
    if (existingSubSubCategory) {
      if(req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete uploaded image if category exists
      return handleResponse(resp, 405, "This Category already exists in your list");
    }

    if (req.file){
      const newCategory = new SubSubCategory({
        name,
        image: `./uploads/Category/SubSubCategory/${userId}/${req.file.filename}`, 
        subCategory:existingSubCategory._id,
        mainCategory:existingSubCategory.mainCategory,
        userId,
        hasSize:isSize
      });
  
      await newCategory.save();
      return handleResponse(resp, 201, `Category of ${existingSubCategory?.name} created successfully`, newCategory);
    }
    const newCategory = new SubSubCategory({
      name,
      subCategory:existingSubCategory._id,
      mainCategory:existingSubCategory.mainCategory,
      userId,
      hasSize:isSize
    });

    await newCategory.save();
    return handleResponse(resp, 201, `Category of ${existingSubCategory?.name} created successfully`, newCategory);
  } catch (error) {
    if (req.file) fs.unlinkSync(`uploads/Category/SubSubCategory/${userId}/${req.file.filename}`); // Delete image if an error occurs
    return handleError(resp, error);
  }
});
Routes.get("/getAllSubSubCategory/:subCategory",adminChecker,async(req,resp)=>{
  try {
    const {subCategory}=req.params
    if(!subCategory || !mongoose.isValidObjectId(subCategory)) return handleResponse(resp,400,"Invalid Sub Category Id")
    
    const existingSubCategory=await SubCategory.findOne({_id:subCategory,userId:req.user._id}).select("-image")
    if(!existingSubCategory) return handleResponse(resp,404,"This SubCategory is not exists in your list")

    const result=await SubSubCategory.find({subCategory,userId:req.user._id})
    if(result.length===0) return handleResponse(resp,404,"Category List is empty")
    return handleResponse(resp,202,"All Categories fetched successfully",result)
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.get("/getSubSubCategory/:subsubCategory",adminChecker,async(req,resp)=>{
  try {
    const {subsubCategory}=req.params
    if(!subsubCategory || !mongoose.isValidObjectId(subsubCategory)) return handleResponse(resp,400,"Invalid Sub Sub Category Id")
    
    const result=await SubSubCategory.findOne({_id:subsubCategory,userId:req.user._id}).select("-image -subCategory -mainCategory")
    if(!result || Object.keys(result).length===0) return handleResponse(resp,404,"Category is not found")
    return handleResponse(resp,202,"Category fetched successfully",result)
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.delete("/deleteSubSubCategory/:subSubCategory",adminChecker,async(req,resp)=>{
  try {
    const {subSubCategory}=req.params
    if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,400,"Invalid Category Id")

    const existingSubSubCategory= await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
    if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not exists in your list.")
    
    await Product.deleteMany({subSubCategory,userId:req.user._id})
    await StockHistory.deleteMany({subSubCategory,userId:req.user._id})
    await SubSubCategory.deleteOne({_id:subSubCategory,userId:req.user._id})
    return handleResponse(resp,202,"This Category Deleted Successfully!")
  } catch (error) {
    return handleError(resp,error)
  }
})

// vendors
Routes.post("/createVendor/:subSubCategory",adminChecker,async(req,resp)=>{
  try {
    const {subSubCategory}=req.params
    const {name}=req.body

    if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,404,"Invalid Category Id")
    if(!name) return handleResponse(resp,404,"Vendor name is required")

    const existingSubSubCategory=await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id})
    if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not found in your list")
    
    const existingVendor=await Vendor.findOne({subSubCategory,name,userId:req.user._id})
    if(existingVendor) return handleResponse(resp,400,"Vendor related to this name already exists")
    
    const newVendor= new Vendor({name,subSubCategory,userId:req.user._id})
    await newVendor.save()
    return handleResponse(resp,201,"Vendor created successfully")
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.get("/getAllVendors/:subSubCategory",adminChecker,async(req,resp)=>{
  try {
    const {subSubCategory}=req.params
    if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,404,"Invalid Category Id")

    const existingSubSubCategory=await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image -mainCategory -subCategory")
    if(!existingSubSubCategory) return handleResponse(resp,404,"This category is not found in your list")
    
    const allVendors=await Vendor.find({subSubCategory,userId:req.user._id})
    if(!allVendors || allVendors.length===0) return handleResponse(resp,404,"Vendor list is empty")
    return handleResponse(resp,202,"All Vendor fetched successfully",allVendors)
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.delete("/deleteVendor/:vendorId",adminChecker,async(req,resp)=>{
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
})
Routes.delete("/deleteAllVendors/:subSubCategory",adminChecker,async(req,resp)=>{
  try {
    const {subSubCategory}=req.params
    if(!subSubCategory || !mongoose.isValidObjectId(subSubCategory)) return handleResponse(resp,404,"Invalid Category Id")

    const existingSubSubCategory=await SubSubCategory.findOne({_id:subSubCategory,userId:req.user._id}).select("-image")
    if(!existingSubSubCategory) return handleResponse(resp,404,"This Category is not exists in your list.")
    
    const result=await Vendor.deleteMany({subSubCategory:existingSubSubCategory._id,userId:req.user._id})
    return handleResponse(resp,202,`${result.deletedCount} Vendors deleted!`)
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.put("/updateVendor/:vendorId",adminChecker,async(req,resp)=>{
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
})

//options
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
Routes.post("/createOptions/:subSubCategory",adminChecker,async (req, resp) => {
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
});
Routes.get("/getAllOptions/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.delete("/deleteOption/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.delete("/deleteAllOptions/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.put("/updateOptionValues/:schemaId",adminChecker,async(req,resp)=>{
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
})

//fixed sizes
Routes.post("/addSizes/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.get("/getAllSizes/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.delete("/deleteSize/:sizeId",adminChecker,async(req,resp)=>{
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
})


// products
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
Routes.post("/addProduct/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.get("/getAllProducts/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.delete("/deleteProduct/:productId",adminChecker,async(req,resp)=>{
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
})
Routes.delete("/deleteAllProducts/:subSubCategory",adminChecker,async(req,resp)=>{
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
})
Routes.put("/updateProduct/:subSubCategory/:productId",adminChecker,async(req,resp)=>{
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
})
// checking past/today date
const isPastOrToday = (inputDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time
  const date = new Date(inputDate);
  date.setHours(0, 0, 0, 0);

  return date <= today;
};
// purchase
Routes.post("/addStock/:productId",adminChecker,async(req,resp)=>{
  try {
    const {productId} = req.params
    if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,404,"Invalid Product Id")

    const {stock,vendor,cost,date,othercharges,message} = req.body
    if(!vendor || vendor==="none") return handleResponse(resp,400,"Select the vendor")
    if(!cost) return handleResponse(resp,400,"Cost is required")
    if(!stock) return handleResponse(resp,404,"Stock is required")
    if(cost<0) return handleResponse(resp,400,"Cost per item is invalid.")
    if(stock<=0) return handleResponse(resp,400,"Stock Value is invalid.")
    if(othercharges<0) return handleResponse(resp,400,"GST and other charges is invalid.")
    if(!mongoose.isValidObjectId(vendor)) return handleResponse(resp,400,"Invalid Vendor Id.")

    if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")

    const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
    if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list.")

    const existingVendor = await Vendor.findOne({_id:vendor,userId:req.user._id})
    if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")

    const existingSubSubCategory = await SubSubCategory.findOne({_id:existingProduct.subSubCategory,userId:req.user._id}).select("-image")
    existingProduct.stock+=parseInt(stock)
    await existingProduct.save()
    if(date){
      const newPurchase = new Purchase({
        productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,subSubCategory:existingSubSubCategory._id,
        cost,otherCharges:othercharges,date:new Date(date),quantity:stock,userId:req.user._id
      })
      await newPurchase.save()
    } else{
      const newPurchase = new Purchase({
        productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,subSubCategory:existingSubSubCategory._id,
        cost,otherCharges:othercharges,quantity:stock,userId:req.user._id
      })
      await newPurchase.save()
    }
    return handleResponse(resp,202,"Stock Added Successfully")
  } catch (error) {
    return handleError(resp,error)
  }
})
//rate
Routes.post("/addRate/:productId",adminChecker,async(req,resp)=>{
  try {
    const {productId} = req.params
    if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,404,"Invalid Product Id")

    const {stock,vendor,cost,date,othercharges,message} = req.body
    if(!vendor || vendor==="none") return handleResponse("Select the Vendor")
    if(!cost) return handleResponse("Cost is required")

    if(cost<0) return handleResponse(resp,400,"Cost per item is invalid.")
    if(stock<0) return handleResponse(resp,400,"Stock Value is invalid.")
    if(othercharges<0) return handleResponse(resp,400,"GST and other charges is invalid.")
    if(!mongoose.isValidObjectId(vendor)) return handleResponse(resp,400,"Invalid Vendor Id.")
    
    if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")
    
    const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
    if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list.")

    const existingVendor = await Vendor.findOne({_id:vendor,userId:req.user._id})
    if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")

    if(date){
      const newRate = new Rate({
        productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,subSubCategory:existingProduct.subSubCategory,
        cost,otherCharges:othercharges,date:new Date(date),quantity:stock,userId:req.user._id
      })
      await newRate.save()
    } else {
      const newRate = new Rate({
        productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,subSubCategory:existingProduct.subSubCategory,
        cost,otherCharges:othercharges,quantity:stock,userId:req.user._id
      })
      await newRate.save()
    }
    return handleResponse(resp,201,"New Rate Added Successfully")
  } catch (error) {
    return handleError(resp,error)
  }
})
// fetching purchase datasets
Routes.get("/getAllPurchases/:productId",adminPrivacyChecker,async(req,resp)=>{
  try {
    const {productId} = req.params
    if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
    
    const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
    if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
    
    const page = parseInt(req.query?.page) || 1;
    const limit = 10;
    
    const result = await Purchase.find({productId:existingProduct._id,userId:req.user._id}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
    if(!result || result.length===0) return handleResponse(resp,400,"Purchase History of this product is empty")
    return handleResponse(resp,202,"Purchase history loaded successfully",result)
  } catch (error) {
    return handleError(resp,error)
  }
})
// counting number of purchase datasets and total pages for pagination of purchase history
Routes.get("/getTotalPurchasePages/:productId",adminPrivacyChecker,async(req,resp)=>{
  try {
    const {productId} = req.params
    if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
    
    const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
    if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
    
    const limit = 10;
    const totalPurchases = await Purchase.countDocuments({ productId: existingProduct._id, userId: req.user._id });
    const totalPages = Math.ceil(totalPurchases / limit);
    return handleResponse(resp,202,"Purchase history calculated",{totalPurchases,totalPages})
  } catch (error) {
    return handleError(resp,error)
  }
})
// fetching rate datasets
Routes.get("/getAllRates/:productId",adminPrivacyChecker,async(req,resp)=>{
  try {
    const {productId} = req.params
    if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
    
    const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
    if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
    
    const page = parseInt(req.query?.page) || 1; 
    const limit = 10; 

    const result = await Rate.find({productId:existingProduct._id,userId:req.user._id}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
    if(!result || result.length===0) return handleResponse(resp,400,"Rate History of this product is empty")
    return handleResponse(resp,202,"Rate history loaded successfully",result)
  } catch (error) {
    return handleError(resp,error)
  }
})
// counting number of rate datasets and total pages for pagination of rate history
Routes.get("/getTotalRatePages/:productId",adminPrivacyChecker,async(req,resp)=>{
  try {
    const {productId} = req.params
    if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
    
    const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
    if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
    
    const limit = 10; 
    const totalRates = await Rate.countDocuments({ productId: existingProduct._id, userId: req.user._id });
    const totalPages = Math.ceil(totalRates / limit);
    return handleResponse(resp,202,"Rate history calculated",{totalPages,totalRates})
  } catch (error) {
    return handleError(resp,error)
  }
})

// privacy passwords
Routes.put("/createPrivacyPassword",adminChecker,async(req,resp)=>{
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
})
Routes.get("/fetchPrivacyPassword",adminChecker,async(req,resp)=>{
  try {
    const existingUser= await Admin.findById(req.user._id).select("-password -role")
    if(existingUser.privacyPassword) return handleResponse(resp,202,"Privacy Password already exists",{status:true})
    return handleResponse(resp,202,"Privacy Password does not exists",{status:false})
  } catch (error) {
    return handleError(resp,error)
  }
})
Routes.post("/checkPrivacyPassword",adminChecker,async(req,resp)=>{
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
})
//user login password changes
Routes.put("/changeUserLoginPassword",adminChecker,async(req,resp)=>{
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
})

// getting All categories(category tree)
Routes.get("/categories",adminChecker,async(req,resp)=>{
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
}) 
// get User Details
Routes.get("/getUser",adminChecker,async(req,resp)=>{
  try {
    const {name,phone,email,address,city,state} = req.user
    return handleResponse(resp,202,"User fetched",{name,phone,email,address,city,state})
  } catch (error) {
    return handleError(resp,error)
  }
})
module.exports = Routes;  