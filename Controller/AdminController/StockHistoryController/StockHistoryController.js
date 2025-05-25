const mongoose=require("mongoose")
require("dotenv").config()
const {handleResponse,handleError}=require("../../../Responses/Responses");
const Vendor = require("../../../Model/VendorModel/VendorModel");
const Product = require("../../../Model/ProductModel/ProductModel");
const { StockIn, StockReturn, Credit, StockHistory, Debit } = require("../../../Model/StockHistoryModel/StockHistoryModel");

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
      
          const {quantity,vendorId,costPerUnit,date,otherCharges,gst,message} = req.body
          if(!vendorId || vendorId==="none") return handleResponse(resp,400,"Select the vendor")
          if(!costPerUnit) return handleResponse(resp,400,"Cost is required")
          if(!quantity) return handleResponse(resp,404,"Quantity is required")
          if(costPerUnit<0) return handleResponse(resp,400,"Cost per unit is invalid.")
          if(quantity<=0) return handleResponse(resp,400,"Quantity is invalid.")
          if(otherCharges<0) return handleResponse(resp,400,"Other Charges is invalid.")
          if(![0,5,12,18,28].includes(gst)) return handleResponse(resp,400,"GST Charges is required or invalid.")
          
          if(!mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id.")
      
          if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")
      
          const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
          if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list.")
      
          const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
          if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")
      
          existingProduct.stock+=parseInt(quantity)
          await existingProduct.save()
          const amount=costPerUnit*quantity
          const gstCharges=(amount*gst)/100
          const totalAmount=amount+gstCharges
          existingVendor.balance+=totalAmount
          await existingVendor.save()
          if(date){
            const newPurchase = new StockIn({
              productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,
              costPerUnit,otherCharges,totalAmount,gst,gstCharges,date:new Date(date),quantity,userId:req.user._id
            })
            await newPurchase.save()
          } else{
            const newPurchase = new StockIn({
              productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,
              costPerUnit,otherCharges,totalAmount,gst,gstCharges,quantity,userId:req.user._id
            })
            await newPurchase.save()
          }
          return handleResponse(resp,201,"Stock Added Successfully")
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
          
          const result = await StockIn.find({productId:existingProduct._id,userId:req.user._id}).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name").lean();
          if(!result || result.length===0) return handleResponse(resp,400,"Purchase History of this product is empty")
          
          const stockInIds = result.map(stock => stock._id);
          const stockReturns = await StockReturn.find({parentStockHistoryId: { $in: stockInIds },userId: req.user._id}).populate("vendorId","name").lean();
          
          const groupedReturns = {};
          stockReturns.forEach(ret => {
          if (!groupedReturns[ret.parentStockHistoryId]) {groupedReturns[ret.parentStockHistoryId] = [];}
          groupedReturns[ret.parentStockHistoryId].push(ret);
          });

          const enrichedStockIns = result.map(stock => ({...stock,stockReturns: groupedReturns[stock._id] || []}));
          return handleResponse(resp,202,"Purchase history loaded successfully",enrichedStockIns)
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
          const totalPurchases = await StockIn.countDocuments({ productId: existingProduct._id, userId: req.user._id });
          const totalPages = Math.ceil(totalPurchases / limit);
          return handleResponse(resp,202,"Purchase history calculated",{totalPurchases,totalPages})
        } catch (error) {
          return handleError(resp,error)
        }
      },
    addReturn:async(req,resp)=>{
      try {
        const {stockInId} = req.params
        if(!stockInId || !mongoose.isValidObjectId(stockInId)) return handleResponse(resp,400,"Invalid Purchase Id")
    
        const {quantity,message,date,otherCharges} = req.body
        if(!quantity) return handleResponse(resp,400,"Quantity is required")
        if(quantity<=0) return handleResponse(resp,400,"Quantity is invalid.")
        if(!message) return handleResponse(resp,400,"Message is required")
        if(otherCharges<0) return handleResponse(resp,400,"Other Charges is invalid.")

        if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")

        const existingPurchase = await StockIn.findOne({_id:stockInId,userId:req.user._id})
        if(!existingPurchase) return handleResponse(resp,400,"This Purchase is not exists in your list.")

        const existingVendor = await Vendor.findOne({_id:existingPurchase.vendorId,userId:req.user._id})
        if(!existingVendor) return handleResponse(resp,400,"This vendor is not exists in your list.")

        const existingProduct = await Product.findOne({_id:existingPurchase.productId,userId:req.user._id})
        if(!existingProduct) return handleResponse(resp,400,"This product is not exists in your list.")

        const previousReturns = await StockReturn.find({parentStockHistoryId: stockInId});
        const alreadyReturnedQty = previousReturns.reduce((sum, r) => sum + r.quantity, 0);
        if (parseInt(alreadyReturnedQty) + parseInt(quantity) > existingPurchase.quantity) return handleResponse(resp,404,"Return quantity exceeds original purchase quantity.",previousReturns)
        
        const amount = quantity * (existingPurchase.costPerUnit || 0);
        const gstCharges = (amount * existingPurchase.gst)/100 
        const returnAmount = amount + gstCharges 
        
        const newStock = parseInt(quantity);
        const oldStock = existingProduct.stock;
        const stockDifference = oldStock - newStock;

        if (stockDifference < 0) {
          return handleResponse(resp,404,`Not enough stock! You have ${existingProduct.stock} pcs in the product.`)
        }

        existingProduct.stock-=newStock
        await existingProduct.save()

        existingVendor.balance-=returnAmount
        await existingVendor.save()
        
        if(date){
          const newReturn = new StockReturn({
            productId:existingProduct._id,vendorId:existingPurchase.vendorId,vendorName:existingPurchase.vendorName,message,totalAmount:returnAmount,parentStockHistoryId:existingPurchase._id,
            costPerUnit:existingPurchase.costPerUnit,otherCharges,gst:existingPurchase.gst,gstCharges,date:new Date(date),quantity,userId:req.user._id
          })
          await newReturn.save()
        } else{
          const newReturn = new StockReturn({
            productId:existingProduct._id,vendorId:existingPurchase.vendorId,vendorName:existingPurchase.vendorName,message,totalAmount:returnAmount,parentStockHistoryId:existingPurchase._id,
            costPerUnit:existingPurchase.costPerUnit,otherCharges,gst:existingPurchase.gst,gstCharges,quantity,userId:req.user._id
          })
          await newReturn.save()
        }
        return handleResponse(resp,201,"Stock Returned!")
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
        
        const result = await StockReturn.find({productId:existingProduct._id,userId:req.user._id}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
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
        const totalReturns = await StockReturn.countDocuments({ productId: existingProduct._id, userId: req.user._id });
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
        
        const result = await StockHistory.find({productId:existingProduct._id,userId:req.user._id, type: { $in: ['stock_in', 'stock_return'] } }).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).populate("vendorId","name")
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
        const totalHistory = await StockHistory.countDocuments({ productId: existingProduct._id, userId: req.user._id, type: { $in: ['stock_in', 'stock_return'] } });
        const totalPages = Math.ceil(totalHistory / limit);
        return handleResponse(resp,202,"All history calculated",{totalHistory,totalPages})
      } catch (error) {
        return handleError(resp,error)
      }
    },
    createDebitNote:async(req,resp)=>{
      try {
      const { vendorId, amount, date, gst, otherCharges, message} = req.body;
      if(!vendorId || vendorId==="none") return handleResponse(resp,400,"Select the vendor")
      if(!amount) return handleResponse(resp,400,"Amount is required")
      if(amount<=0) return handleResponse(resp,400,"Amount should be greator than zero.")
      if(!message) return handleResponse(resp,400,"Message is required")
      if(otherCharges<0) return handleResponse(resp,400,"Other Charges is invalid.")
      if(!gst || ![0,5,12,18,28].includes(gst)) return handleResponse(resp,400,"GST Charges is required or invalid.")
      if(!mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id.")
      if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")
      
      const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
      if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")

      const gstCharges = (gst / 100) * amount;
      const totalAmount = parseFloat(amount) + gstCharges

      if (existingVendor.balance < totalAmount) return handleResponse(resp,404,"Insufficient vendor balance to issue debit note");

      existingVendor.balance-=totalAmount
      await existingVendor.save()

      if(date){
        const newDebit = new Debit({userId:req.user._id,vendorId:existingVendor._id,date,vendorName:existingVendor.name,totalAmount,gst,gstCharges,otherCharges,message});
        await newDebit.save();
      }else{
        const newDebit = new Debit({userId:req.user._id,vendorId:existingVendor._id,vendorName:existingVendor.name,totalAmount,gst,gstCharges,otherCharges,message});
        await newDebit.save();
      }
      return handleResponse(resp,201,"Debit Note issued")
      } catch (error) {
        return handleError(resp,error)
      }
    },
    createCreditNote:async(req,resp)=>{
      try {
      const { vendorId, amount, date, gst, otherCharges, message} = req.body;
      if(!vendorId || vendorId==="none") return handleResponse(resp,400,"Select the vendor")
      if(!amount) return handleResponse(resp,400,"Amount is required")
      if(amount<=0) return handleResponse(resp,400,"Amount should be greator than zero.")
      if(!message) return handleResponse(resp,400,"Message is required")
      if(otherCharges<0) return handleResponse(resp,400,"Other Charges is invalid.")
      if(!gst || ![0,5,12,18,28].includes(gst)) return handleResponse(resp,400,"GST Charges is required or invalid.")
      if(!mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id.")
      if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")
      
      const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
      if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")

      const gstCharges = (gst / 100) * amount;
      const totalAmount = parseFloat(amount) + gstCharges

      existingVendor.balance+=totalAmount
      await existingVendor.save()

      if(date){
        const newCredit = new Credit({userId:req.user._id,vendorId:existingVendor._id,date,vendorName:existingVendor.name,totalAmount,gst,gstCharges,otherCharges,message});
        await newCredit.save();
      }else{
        const newCredit = new Credit({userId:req.user._id,vendorId:existingVendor._id,vendorName:existingVendor.name,totalAmount,gst,gstCharges,otherCharges,message});
        await newCredit.save();
      }
      return handleResponse(resp,201,"Credit Note issued")
      } catch (error) {
        return handleError(resp,error)
      }
    }
}
module.exports=StockHistoryController