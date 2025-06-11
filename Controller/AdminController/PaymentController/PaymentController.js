const mongoose=require("mongoose")
require("dotenv").config()
const {handleResponse,handleError} = require("../../../Responses/Responses");
const Vendor = require("../../../Model/VendorModel/VendorModel");
const Payment = require("../../../Model/PaymentModel/PaymentModel");
const { StockHistory } = require("../../../Model/StockHistoryModel/StockHistoryModel");
// checking past/today date
const isPastOrToday = (inputDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize time
    const date = new Date(inputDate);
    date.setHours(0, 0, 0, 0);
  
    return date <= today;
  };
const getFinancialYearRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const start = new Date(year, 3, 1); 
  const end = new Date(year + 1, 3, 1); 
  return { start, end };
};
const PaymentController={
    createPayment:async(req,resp)=>{
        try {
          const {vendorId,amount,method,date,message} = req.body
          if(!vendorId || vendorId==="none") return handleResponse(resp,400,"Vendor is required")
          if(!amount || amount<=0) return handleResponse(resp,400,"Valid Amount is required")
          if(!method || !['cash', 'bank', 'upi'].includes(method)) return handleResponse(resp,400,"Payment Method is required or invalid.")
          if(!mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id.")
          if(date && !isPastOrToday(date)) return handleResponse(resp,400,"Date must not be in the future.")

          const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
          if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")
          
          existingVendor.balance-=amount
          await existingVendor.save()

          if(date){
            const payment = new Payment({userId:req.user._id,vendorId:existingVendor._id,amount,method,date,message});
            await payment.save()
          } else{
            const payment = new Payment({userId:req.user._id,vendorId:existingVendor._id,amount,method,message});
            await payment.save()
          }
          return handleResponse(resp,201,"Payment recorded")
        } catch (error) {
            return handleError(resp,error)
        }
    },
    getCurrentMonthLedger:async(req,resp)=>{
        try {
            const { vendorId } = req.params;
            if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id")
                
            const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
            if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const stockEntries = await StockHistory.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: startOfMonth } }).populate('productId','name').sort({ date: 1 }).lean();
            const paymentEntries = await Payment.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: startOfMonth } }).sort({ date: 1 }).lean();

            const normalizedStock = stockEntries.map(e => ({
                date: e.date,
                description:e.type.toUpperCase()+(e.message?": "+e.message:" "),
                debit: ['stock_in', 'debit_note'].includes(e.type) ? e.totalAmount : 0,
                credit: ['stock_return', 'credit_note'].includes(e.type) ? e.totalAmount : 0,
                type: e.type,
                data:{
                    productName:e.productId?.name || null,
                    quantity:e.quantity || null,
                    costPerUnit:e.costPerUnit || 0,
                    totalAmount:e.totalAmount || 0,
                    otherCharges:e.otherCharges || 0,
                    gst:e.gst || 0,
                    gstCharges:e.gstCharges || 0 
                }
            }));

            const normalizedPayments = paymentEntries.map(e => ({
                date: e.date,
                description: 'Payment'+(e.message?": "+e.message:""),
                method:e.method,
                debit: 0,
                credit: e.amount,
                type: 'payment',
                message:e.message || "N/A"
            }));
            
            const combined = [...normalizedStock, ...normalizedPayments].sort((a, b) => new Date(a.date) - new Date(b.date));

            let balance = 0;
            const ledger = combined.map(entry => {
                balance += (entry.debit || 0) - (entry.credit || 0);
                return { ...entry, balance };
            });
            if (ledger.length === 0) return handleResponse(resp, 400, "No records found for this period");
            return handleResponse(resp,202,"Account ledger is fetched",ledger)
        } catch (error) {
            return handleError(resp,error)
        }
    },
    getFinancialYearLedger:async(req,resp)=>{
        try {
            const { vendorId } = req.params;
            if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid Vendor Id")
                
            const existingVendor = await Vendor.findOne({_id:vendorId,userId:req.user._id})
            if(!existingVendor) return handleResponse(resp,400,"This Vendor is not exists in your list.")

            const { start, end } = getFinancialYearRange();

            const stockEntries = await StockHistory.find({userId:req.user._id,vendorId:existingVendor._id,date: { $gte: start, $lt: end }}).populate('productId','name').sort({ date: 1 }).lean();
            const paymentEntries = await Payment.find({userId:req.user._id,vendorId:existingVendor._id,date: { $gte: start, $lt: end }}).sort({ date: 1 }).lean();

            const normalizedStock = stockEntries.map(e => ({
                date: e.date,
                description:e.type.toUpperCase()+(e.message?": "+e.message:" "),
                debit: ['stock_in', 'debit_note'].includes(e.type) ? e.totalAmount : 0,
                credit: ['stock_return', 'credit_note'].includes(e.type) ? e.totalAmount : 0,
                type: e.type,
                data:{
                    productName:e.productId?.name || null,
                    quantity:e.quantity || null,
                    costPerUnit:e.costPerUnit || 0,
                    totalAmount:e.totalAmount || 0,
                    otherCharges:e.otherCharges || 0,
                    gst:e.gst || 0,
                    gstCharges:e.gstCharges || 0 
                }
            }));

            const normalizedPayments = paymentEntries.map(e => ({
                date: e.date,
                description: 'Payment'+(e.message?": "+e.message:""),
                method:e.method,
                debit: 0,
                credit: e.amount,
                type: 'payment',
                message:e.message || "N/A"
            }));

            const combined = [...normalizedStock, ...normalizedPayments].sort((a, b) => new Date(a.date) - new Date(b.date));

            let balance = 0;
            const ledger = combined.map(entry => {
                balance += (entry.debit || 0) - (entry.credit || 0);
                return { ...entry, balance };
            });
            if (ledger.length === 0) return handleResponse(resp, 400, "No records found for this period");
            return handleResponse(resp,202,"Account ledger is fetched",ledger)
        } catch (error) {
            return handleError(resp,error)
        }
    }
}
module.exports=PaymentController