const mongoose=require("mongoose")
require("dotenv").config()
const { SubSubCategory } = require("../../../Model/CategoryModel/CategoryModel");
const {handleResponse,handleError}=require("../../../Responses/Responses");
const Vendor = require("../../../Model/VendorModel/VendorModel");
const Product = require("../../../Model/ProductModel/ProductModel");
const { Purchase, Rate, Return, StockHistory, Sale } = require("../../../Model/StockHistoryModel/StockHistoryModel");

// checking past/today date
const isPastOrToday = (inputDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize time
    const date = new Date(inputDate);
    date.setHours(0, 0, 0, 0);
  
    return date <= today;
  };
const StockHistoryController={
    addStock:async(req,resp)=>{
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
      },
    addRate:async(req,resp)=>{
        try {
          const {productId} = req.params
          if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,404,"Invalid Product Id")
      
          const {stock,vendor,cost,date,othercharges,message} = req.body
          if(!vendor || vendor==="none") return handleResponse(resp,400,"Select the Vendor")
          if(!cost) return handleResponse(resp,400,"Cost is required")
      
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
      },
    getAllPurchases:async(req,resp)=>{
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
      },
    getTotalPurchasePages:async(req,resp)=>{
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
      },
    getAllRates:async(req,resp)=>{
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
      },
    getTotalRatePages:async(req,resp)=>{
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
      },
    updatePurchase:async (req, resp) => {
      try {
        const { purchaseId } = req.params;
        if (!purchaseId || !mongoose.isValidObjectId(purchaseId))
          return handleResponse(resp, 400, "Invalid Purchase Id");
    
        const { stock,vendor,cost, date, othercharges, message } = req.body;

        if(!vendor || vendor==="none") return handleResponse(resp,400,"Vendor is required")
        if (!cost && cost !== 0) return handleResponse(resp, 400, "Cost is required");
        if (!stock && stock !== 0) return handleResponse(resp, 404, "Stock is required");
        if (cost < 0) return handleResponse(resp, 400, "Cost per item is invalid.");
        if (stock <= 0) return handleResponse(resp, 400, "Stock value is invalid.");
        if (othercharges < 0) return handleResponse(resp, 400, "GST and other charges is invalid.");
        if(!mongoose.isValidObjectId(vendor)) return handleResponse(resp,400,"Vendor is invalid")
        if (date && !isPastOrToday(date)) return handleResponse(resp, 400, "Date must not be in the future.");
    
        const existingPurchase = await Purchase.findOne({ _id: purchaseId, userId: req.user._id }).select("-vendor");
        if (!existingPurchase) return handleResponse(resp, 400, "This Purchase does not exist in your list");
    
        const existingProduct = await Product.findOne({ _id: existingPurchase.productId, userId: req.user._id });
        if (!existingProduct) return handleResponse(resp, 400, "Product of this Purchase is not available");
    
        const existingVendor = await Vendor.findOne({_id:vendor,userId:req.user._id})
        if(!existingVendor) return handleResponse(resp,404,"This vendor is not exists in your list")

        const newStock = parseInt(stock);
        const oldStock = existingPurchase.quantity;
        const stockDifference = newStock - oldStock;
    
        const applyPurchaseUpdates = async () => {
          existingPurchase.cost = cost;
          existingPurchase.quantity = newStock;
          existingPurchase.date = date;
          existingPurchase.otherCharges = othercharges;
          existingPurchase.message = message;
          existingPurchase.vendorId=existingVendor._id
          existingPurchase.vendorName=existingVendor.name
          await existingPurchase.save();
        };
    
        if (stockDifference === 0) {
          await applyPurchaseUpdates();
          return handleResponse(resp, 202, "Purchase Updated!");
        }
    
        if (stockDifference < 0) {
          const reduction = Math.abs(stockDifference);
          if (existingProduct.stock >= reduction) {
            existingProduct.stock -= reduction;
            await existingProduct.save();
            await applyPurchaseUpdates();
            return handleResponse(resp, 202, "Purchase Updated!");
          } else {
            return handleResponse(resp, 400, "Not enough stock in your Product");
          }
        }
    
        // If stockDifference > 0
        existingProduct.stock += stockDifference;
        await existingProduct.save();
        await applyPurchaseUpdates();
        return handleResponse(resp, 202, "Purchase Updated!");
    
      } catch (error) {
        return handleError(resp, error);
      }
    },
    updateRate:async (req, resp) => {
      try {
        const { rateId } = req.params;
        if (!rateId || !mongoose.isValidObjectId(rateId))
          return handleResponse(resp, 400, "Invalid Rate Id");
    
        const { stock, cost,vendor,date, othercharges, message } = req.body;
    
        if(!vendor || vendor==="none") return handleResponse(resp,400,"Vendor is required")
        if (!cost && cost !== 0) return handleResponse(resp, 400, "Cost is required");
        if (cost < 0) return handleResponse(resp, 400, "Cost per item is invalid.");
        if (stock < 0) return handleResponse(resp, 400, "Stock value is invalid.");
        if (othercharges < 0) return handleResponse(resp, 400, "GST and other charges is invalid.");
        if(!mongoose.isValidObjectId(vendor)) return handleResponse(resp,400,"Vendor is invalid")
        if (date && !isPastOrToday(date)) return handleResponse(resp, 400, "Date must not be in the future.");
    
        const existingVendor = await Vendor.findOne({_id:vendor,userId:req.user._id})
        if(!existingVendor) return handleResponse(resp,404,"This vendor is not exists in your list")

        const existingRate = await Rate.findOne({ _id: rateId, userId: req.user._id }).select("-vendor");
        if (!existingRate) return handleResponse(resp, 400, "This Rate does not exists in your list");
    
        existingRate.cost = cost;
        existingRate.quantity = stock;
        existingRate.date = date;
        existingRate.otherCharges = othercharges;
        existingRate.message = message;
        existingRate.vendorId=existingVendor._id
        existingRate.vendorName=existingVendor.name
        await existingRate.save();
        return handleResponse(resp,202,"Rate Updated!")
      } catch (error) {
        return handleError(resp, error);
      }
    },
    deleteRate:async (req, resp) => {
      try {
        const { rateId } = req.params;
        if (!rateId || !mongoose.isValidObjectId(rateId)) return handleResponse(resp, 400, "Invalid Rate Id");
    
        const existingRate = await Rate.findOne({ _id: rateId, userId: req.user._id }).select("-vendor");
        if (!existingRate) return handleResponse(resp, 400, "This Rate does not exists in your list");

        await Rate.deleteOne({ _id: rateId, userId: req.user._id})
        return handleResponse(resp,202,"Rate deleted!")
      } catch (error) {
        return handleError(resp, error);
      }
    },
    addReturn:async(req,resp)=>{
      try {
        const {purchaseId} = req.params
        if(!purchaseId || !mongoose.isValidObjectId(purchaseId)) return handleResponse(resp,404,"Invalid Purchase Id")
    
        const {stock,message} = req.body
        if(!stock) return handleResponse(resp,404,"Stock is required")
        if(stock<=0) return handleResponse(resp,400,"Stock Value is invalid.")
    
        const existingPurchase = await Purchase.findOne({_id:purchaseId,userId:req.user._id})
        if(!existingPurchase) return handleResponse(resp,404,"This Purchase is not exists in your list.")
        if(existingPurchase.returned) return handleResponse(resp,400,"This Purchase is already returned.")

        const existingProduct = await Product.findOne({_id:existingPurchase.productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list.")
        
        const newStock = parseInt(stock);
        const oldStock = existingProduct.stock;
        const stockDifference = oldStock - newStock;

        if (stockDifference < 0) {
          return handleResponse(resp,400,"Not enough stock in this product")
        }

        existingProduct.stock-=newStock
        await existingProduct.save()

        existingPurchase.returned=true
        await existingPurchase.save()
        
        const newReturn = new Return({
          productId:existingProduct._id,vendorId:existingPurchase.vendorId,vendorName:existingPurchase.vendorName,message,subSubCategory:existingPurchase.subSubCategory,
          cost:existingPurchase.cost,otherCharges:existingPurchase.otherCharges,date:existingPurchase.date,quantity:newStock,userId:req.user._id
        })
        await newReturn.save()
        return handleResponse(resp,202,"Stock Returned!")
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getAllReturns:async(req,resp)=>{
      try {
        const {productId} = req.params
        if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
        
        const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
        
        const page = parseInt(req.query?.page) || 1;
        const limit = 10;
        
        const result = await Return.find({productId:existingProduct._id,userId:req.user._id}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
        if(!result || result.length===0) return handleResponse(resp,400,"Return History of this product is empty")
        return handleResponse(resp,202,"Return history loaded successfully",result)
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getTotalReturnPages:async(req,resp)=>{
      try {
        const {productId} = req.params
        if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
        
        const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
        
        const limit = 10;
        const totalReturns = await Return.countDocuments({ productId: existingProduct._id, userId: req.user._id });
        const totalPages = Math.ceil(totalReturns / limit);
        return handleResponse(resp,202,"Return history calculated",{totalReturns,totalPages})
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getAllHistory:async(req,resp)=>{
      try {
        const {productId} = req.params
        if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
        
        const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
        
        const page = parseInt(req.query?.page) || 1;
        const limit = 10;
        
        const result = await StockHistory.find({productId:existingProduct._id,userId:req.user._id}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
        if(!result || result.length===0) return handleResponse(resp,400,"All History of this product is empty")
        return handleResponse(resp,202,"All history loaded successfully",result)
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getTotalHistoryPages:async(req,resp)=>{
      try {
        const {productId} = req.params
        if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
        
        const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
        
        const limit = 10;
        const totalHistory = await StockHistory.countDocuments({ productId: existingProduct._id, userId: req.user._id });
        const totalPages = Math.ceil(totalHistory / limit);
        return handleResponse(resp,202,"All history calculated",{totalHistory,totalPages})
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getAllSales:async(req,resp)=>{
      try {
        const {productId} = req.params
        if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
        
        const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
        
        const page = parseInt(req.query?.page) || 1;
        const limit = 10;
        
        const result = await Sale.find({productId:existingProduct._id,userId:req.user._id}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
        if(!result || result.length===0) return handleResponse(resp,400,"Sale History of this product is empty")
        return handleResponse(resp,202,"Sale history loaded successfully",result)
      } catch (error) {
        return handleError(resp,error)
      }
    },
    getTotalSalePages:async(req,resp)=>{
      try {
        const {productId} = req.params
        if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,400,"Invalid Product Id")
        
        const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list")
        
        const limit = 10;
        const totalSales = await Sale.countDocuments({ productId: existingProduct._id, userId: req.user._id });
        const totalPages = Math.ceil(totalSales / limit);
        return handleResponse(resp,202,"Sale history calculated",{totalSales,totalPages})
      } catch (error) {
        return handleError(resp,error)
      }
    },
}
module.exports=StockHistoryController