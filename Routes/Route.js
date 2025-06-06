const express = require("express");
const fs=require("fs")
const multer=require("multer")
const path = require('path');
require("dotenv").config()
const {superAdminChecker, adminChecker, adminPrivacyChecker} = require("../Middlewares/Checkuserdetails");
const { handleResponse }=require("../Responses/Responses");
const CommonController = require("../Controller/CommonController/CommonController");
const SuperAdminController = require("../Controller/SuperAdminController/SuperAdminController");
const MainCategoryController = require("../Controller/AdminController/CategoryController/MainCategoryController/MainCategoryController");
const SubCategoryController = require("../Controller/AdminController/CategoryController/SubCategoryController/SubCategoryController");
const SubSubCategoryController = require("../Controller/AdminController/CategoryController/SubSubCategoryController/SubSubCategoryController");
const VendorController = require("../Controller/AdminController/VendorController/VendorController");
const SizeController = require("../Controller/AdminController/SizeController/SizeController");
const OptionController = require("../Controller/AdminController/OptionController/OptionController");
const ProductController = require("../Controller/AdminController/ProductController/ProductController");
const StockHistoryController = require("../Controller/AdminController/StockHistoryController/StockHistoryController");
const AdminController = require("../Controller/AdminController/AdminController");
const CategoryController = require("../Controller/AdminController/CategoryController/CategoryController");
const RateController = require("../Controller/AdminController/RateController/RateController");
const PaymentController = require("../Controller/AdminController/PaymentController/PaymentController");
const Routes = express.Router();

Routes.get("/", async (req, resp) =>handleResponse(resp,202,"Server Health is Okay"))
// common user 
Routes.post("/emailLogin",CommonController.emailLogin)
Routes.post("/verifyLogin",CommonController.verifyLogin)
Routes.get("/checkUserPassword",CommonController.checkUserPassword)
Routes.put("/createPassword",CommonController.createPassword)
Routes.post("/passwordLogin",CommonController.passwordLogin);
Routes.post("/forgetUser",CommonController.forgetUser)
Routes.post("/verifyForgetUser",CommonController.verifyForgetUser)
Routes.put("/createForgetUserPassword",CommonController.createForgetUserPassword)

// superadmin
Routes.post("/verifyuser",superAdminChecker,SuperAdminController.verifyuser);
Routes.post("/createuser",superAdminChecker,SuperAdminController.createuser);
Routes.get("/getallusers",superAdminChecker,SuperAdminController.getallusers)
Routes.put("/enableUser/:userId",superAdminChecker,SuperAdminController.enableUser)
Routes.put("/disableUser/:userId",superAdminChecker,SuperAdminController.disableUser)

//<-------- admin -------->
// User Details (admin)
Routes.get("/getUser",adminChecker,AdminController.getUser)

//settings (admin) ------> login & privacy passwords
Routes.put("/createPrivacyPassword",adminChecker,AdminController.createPrivacyPassword)
Routes.get("/fetchPrivacyPassword",adminChecker,AdminController.fetchPrivacyPassword)
Routes.post("/checkPrivacyPassword",adminChecker,AdminController.checkPrivacyPassword)
Routes.put("/changeUserLoginPassword",adminChecker,AdminController.changeUserLoginPassword)

// All categories---category-tree (admin)
Routes.get("/categories",adminChecker,CategoryController.categories)

// 1st level of category (admin)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname,"..","uploads","Category","MainCategory",String(req.user._id))
      fs.mkdir(uploadPath,{recursive:true},(err)=>{
          if(err) return cb(err,null)
          else cb(null, uploadPath);
      })
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadMainCategory = multer({ storage: storage });
Routes.post("/createMainCategory",adminChecker,uploadMainCategory.single("image"),MainCategoryController.createMainCategory);
Routes.get("/getAllMainCategory",adminChecker,MainCategoryController.getAllMainCategory)

// 2nd level of category (admin)
const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
      const userId=req.user._id
      const uploadPath = path.join(__dirname, '..', 'uploads', 'Category', 'SubCategory', String(userId));
      fs.mkdir(uploadPath,{recursive:true},(err)=>{
          if(err) return cb(err,null)
          else cb(null,uploadPath);
      })
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadSubCategory = multer({ storage: storage1 });
Routes.post("/createSubCategory/:mainCategory",adminChecker,uploadSubCategory.single("image"),SubCategoryController.createSubCategory);
Routes.get("/getAllSubCategory/:mainCategory",adminChecker,SubCategoryController.getAllSubCategory)

// 3rd level of category (admin)
const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
      const userId=req.user._id
      const uploadPath = path.join(__dirname, '..', 'uploads', 'Category', 'SubSubCategory', String(userId));
      fs.mkdir(uploadPath,{recursive:true},(err)=>{
          if(err) return cb(err,null)
          else cb(null,uploadPath);
      })
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadSubSubCategory = multer({ storage: storage2 });
Routes.post("/createSubSubCategory/:subCategory",adminChecker,uploadSubSubCategory.single("image"),SubSubCategoryController.createSubSubCategory);
Routes.get("/getAllSubSubCategory/:subCategory",adminChecker,SubSubCategoryController.getAllSubSubCategory)
Routes.get("/getSubSubCategory/:subsubCategory",adminChecker,SubSubCategoryController.getSubSubCategory)
Routes.delete("/deleteSubSubCategory/:subSubCategory",adminChecker,SubSubCategoryController.deleteSubSubCategory)//error

//options (admin)
Routes.post("/createOptions/:subSubCategory",adminChecker,OptionController.createOptions);
Routes.get("/getAllOptions/:subSubCategory",adminChecker,OptionController.getAllOptions)
Routes.delete("/deleteOption/:subSubCategory",adminChecker,OptionController.deleteOption)
Routes.delete("/deleteAllOptions/:subSubCategory",adminChecker,OptionController.deleteAllOptions)
Routes.put("/updateOptionValues/:schemaId",adminChecker,OptionController.updateOptionValues)

//fixed sizes (admin)
Routes.post("/addSizes/:subSubCategory",adminChecker,SizeController.addSizes)
Routes.get("/getAllSizes/:subSubCategory",adminChecker,SizeController.getAllSizes)
Routes.delete("/deleteSize/:sizeId",adminChecker,SizeController.deleteSize)

// products (admin)
Routes.post("/addProduct/:subSubCategory",adminChecker,ProductController.addProduct)
Routes.get("/getAllProducts/:subSubCategory",adminChecker,ProductController.getAllProducts)
Routes.delete("/deleteProduct/:productId",adminChecker,ProductController.deleteProduct)
Routes.delete("/deleteAllProducts/:subSubCategory",adminChecker,ProductController.deleteAllProducts)
Routes.put("/updateProduct/:subSubCategory/:productId",adminChecker,ProductController.updateProduct)

// vendors (admin)
Routes.post("/createVendor",adminChecker,VendorController.createVendor)
Routes.get("/getVendor/:vendorId",adminChecker,VendorController.getVendor)
Routes.get("/getAllVendors",adminChecker,VendorController.getAllVendors)
Routes.delete("/deleteVendor/:vendorId",adminChecker,VendorController.deleteVendor)
Routes.delete("/deleteAllVendors",adminChecker,VendorController.deleteAllVendors)
Routes.put("/updateVendor/:vendorId",adminChecker,VendorController.updateVendor)

//stock-history (admin)
//1) purchase
Routes.post("/addStock/:productId",adminChecker,StockHistoryController.addStock)
Routes.get("/getAllPurchases/:productId",adminPrivacyChecker,StockHistoryController.getAllPurchases)
Routes.get("/getTotalPurchasePages/:productId",adminPrivacyChecker,StockHistoryController.getTotalPurchasePages)
//2) return
Routes.post("/addReturn/:stockInId",adminPrivacyChecker,StockHistoryController.addReturn)
Routes.get("/getAllReturns/:productId",adminPrivacyChecker,StockHistoryController.getAllReturns)
Routes.get("/getTotalReturnPages/:productId",adminPrivacyChecker,StockHistoryController.getTotalReturnPages)
//3) all history
Routes.get("/getAllHistory/:productId",adminPrivacyChecker,StockHistoryController.getAllHistory)
Routes.get("/getTotalHistoryPages/:productId",adminPrivacyChecker,StockHistoryController.getTotalHistoryPages)
//4) note ( Credit, Debit)
Routes.post("/createCreditNote",adminChecker,StockHistoryController.createCreditNote)
Routes.post("/createDebitNote",adminChecker,StockHistoryController.createDebitNote)

// Rate-history (admin)
Routes.post("/addRate/:productId",adminChecker,RateController.addRate)
Routes.get("/getAllRates/:productId",adminPrivacyChecker,RateController.getAllRates)
Routes.get("/getTotalRatePages/:productId",adminPrivacyChecker,RateController.getTotalRatePages)
Routes.put("/updateRate/:rateId",adminPrivacyChecker,RateController.updateRate)
Routes.delete("/deleteRate/:rateId",adminPrivacyChecker,RateController.deleteRate)

// payment-history (admin)
Routes.post("/createPayment",adminChecker,PaymentController.createPayment)
// vendor-ledger (admin)
Routes.get("/getCurrentMonthLedger/:vendorId",adminChecker,PaymentController.getCurrentMonthLedger)
Routes.get("/getFinancialYearLedger/:vendorId",adminChecker,PaymentController.getFinancialYearLedger)

module.exports = Routes;  