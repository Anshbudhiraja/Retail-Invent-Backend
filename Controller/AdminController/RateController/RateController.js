const mongoose=require("mongoose")
require("dotenv").config()
const {handleResponse,handleError}=require("../../../Responses/Responses");
const Vendor = require("../../../Model/VendorModel/VendorModel");
const Product = require("../../../Model/ProductModel/ProductModel");
const Rate = require("../../../Model/RateModel/RateModel");

// checking past/today date
const isPastOrToday = (inputDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize time
    const date = new Date(inputDate);
    date.setHours(0, 0, 0, 0);
  
    return date <= today;
  };
const RateController={
    addRate:async(req,resp)=>{
        try {
            const {productId} = req.params
            if(!productId || !mongoose.isValidObjectId(productId)) return handleResponse(resp,404,"Invalid Product Id")
          
            const {quantity,vendorId,costPerUnit,date,gst,otherCharges,message} = req.body
            if(!vendorId || vendorId==="none") return handleResponse(resp,400,"Select the Vendor")
            if(!costPerUnit) return handleResponse(resp,400,"Cost is required")
          
            if(costPerUnit<0) return handleResponse(resp,400,"Cost per item is invalid.")
            if(quantity<0) return handleResponse(resp,400,"Quantity is invalid.")
            if(otherCharges<0) return handleResponse(resp,400,"GST and other charges is invalid.")
            if(!gst || ![0,5,12,18,28].includes(gst)) return handleResponse(resp,400,"GST Charges is required or invalid.")
            if(!mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id.")
              
            if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")
              
            const existingProduct = await Product.findOne({_id:productId,userId:req.user._id})
            if(!existingProduct) return handleResponse(resp,404,"This product is not exists in your list.")
          
            const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
            if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")
          
            let totalAmount=0
            let gstCharges=0
            if(quantity>0){
                const amount=costPerUnit*quantity
                gstCharges=(amount*gst)/100
                totalAmount=gstCharges+amount
            }
    
            if(date){
                const newRate = new Rate({
                  productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,
                  costPerUnit,otherCharges,gst,gstCharges,totalAmount,date:new Date(date),quantity,userId:req.user._id
                })
                await newRate.save()
            } else {
                const newRate = new Rate({
                  productId:existingProduct._id,vendorId:existingVendor._id,vendorName:existingVendor.name,message,
                  costPerUnit,otherCharges,gst,gstCharges,totalAmount,quantity,userId:req.user._id
                })
                await newRate.save()
            }
            return handleResponse(resp,201,"New Rate Added Successfully")
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
    updateRate:async (req, resp) => {
        try {
            const { rateId } = req.params;
            if (!rateId || !mongoose.isValidObjectId(rateId)) return handleResponse(resp, 400, "Invalid Rate Id");
        
            const { quantity, costPerUnit,vendorId,date,gst,otherCharges, message } = req.body;
        
            if(!vendorId || vendorId==="none") return handleResponse(resp,400,"Vendor is required")
            if (!costPerUnit && costPerUnit !== 0) return handleResponse(resp, 400, "Cost is required");
            if (costPerUnit < 0) return handleResponse(resp, 400, "Cost per item is invalid.");
            if (quantity < 0) return handleResponse(resp, 400, "Stock value is invalid.");
            if (otherCharges < 0) return handleResponse(resp, 400, "GST and other charges is invalid.");
            if(!gst || ![0,5,12,18,28].includes(gst)) return handleResponse(resp,400,"GST Charges is required or invalid.")
            if(!mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Vendor is invalid")
            if (date && !isPastOrToday(date)) return handleResponse(resp, 400, "Date must not be in the future.");
        
            const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
            if(!existingVendor) return handleResponse(resp,404,"This vendor is not exists in your list")
    
            const existingRate = await Rate.findOne({ _id: rateId, userId: req.user._id })
            if (!existingRate) return handleResponse(resp, 400, "This Rate does not exists in your list");
        

            let totalAmount=0
            let gstCharges=0
            if(quantity>0){
                const amount=costPerUnit*quantity
                gstCharges=(amount*gst)/100
                totalAmount=gstCharges+amount
            }

            existingRate.costPerUnit = costPerUnit;
            existingRate.quantity = quantity;
            existingRate.date = date;
            existingRate.gst = gst;
            existingRate.gstCharges = gstCharges;
            existingRate.totalAmount = totalAmount;
            existingRate.otherCharges = otherCharges;
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
        
            const existingRate = await Rate.findOne({ _id: rateId, userId: req.user._id }).select("-vendorId -vendorName");
            if (!existingRate) return handleResponse(resp, 400, "This Rate does not exists in your list");
    
            await Rate.deleteOne({ _id: rateId, userId: req.user._id})
            return handleResponse(resp,202,"Rate deleted!")
        } catch (error) {
            return handleError(resp, error);
        }
    },
}
module.exports=RateController