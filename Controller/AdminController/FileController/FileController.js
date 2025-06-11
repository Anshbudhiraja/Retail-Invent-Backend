const mongoose = require("mongoose");
const path = require("path")
const fs = require("fs")
require("dotenv").config()
const generateExcelReport = require("../../../Services/ExcelService/ExcelService");
const convertPdf = require('../../../Services/PdfService/PdfService');
const { handleResponse, handleError }=require("../../../Responses/Responses");
const { StockHistory } = require("../../../Model/StockHistoryModel/StockHistoryModel");
const Payment = require("../../../Model/PaymentModel/PaymentModel");
const Vendor = require("../../../Model/VendorModel/VendorModel");

const getFinancialYearRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const start = new Date(year, 3, 1); 
  const end = new Date(year + 1, 3, 1); 
  return { start, end };
};

const FileController={
    excel_current_month:async (req, resp) => {
      try {
        const { vendorId } = req.params;
        if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid vendor Id")
    
        const existingVendor = await Vendor.findOne({userId:req.user._id,_id:vendorId})
        if(!existingVendor) return handleResponse(resp,400,"This vendor is not exists in your list")
          
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
        const stockEntries = await StockHistory.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: startOfMonth } }).sort({ date: 1 }).lean();
        const paymentEntries = await Payment.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: startOfMonth } }).sort({ date: 1 }).lean();
    
        const normalizedStock = stockEntries.map(e => ({
            date: e.date,
            description:e.type.toUpperCase()+(e.message?": "+e.message:" "),
            debit: ['stock_in', 'debit_note'].includes(e.type) ? e.totalAmount : 0,
            credit: ['stock_return', 'credit_note'].includes(e.type) ? e.totalAmount : 0,
            type: e.type,
        }));
    
        const normalizedPayments = paymentEntries.map(e => ({
            date: e.date,
            description: 'Payment'+(e.message?": "+e.message:"")+(" ("+e.method+")"),
            debit: 0,
            credit: e.amount,
            type: 'payment',
        }));
                
        const combined = [...normalizedStock, ...normalizedPayments].sort((a, b) => new Date(a.date) - new Date(b.date));
    
        let balance = 0;
        const ledger = combined.map(entry => {
            balance += (entry.debit || 0) - (entry.credit || 0);
            return { ...entry, balance };
        });
        if (ledger.length === 0) return handleResponse(resp, 400, "No records found for this period");    
        const result= await generateExcelReport(ledger,{name:existingVendor.name,balance:existingVendor.balance,title:now.toLocaleDateString("en-GB",{month:"long",year:"numeric"})});
        if(!result.status) return handleResponse(resp,400,result.message)
        resp.setHeader("Content-Disposition", `attachment; filename="${result.data.filename}"`);
        resp.status(202).download(result.data.outputPath,result.data.filename,error=>{
        if(error) return handleResponse(resp,400,"Could not download the file.")
        fs.unlink(result.data.outputPath,err=>{
          if(err) console.log("File deletion failed:"+err);
          else console.log("File deleted after sending!");})
        })
      } catch (error) {
        return handleError(resp,error)
      }
    },
    excel_financial_year:async (req, resp) => {
  try {
    const { vendorId } = req.params;
    if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid vendor Id")

    const existingVendor = await Vendor.findOne({userId:req.user._id,_id:vendorId})
    if(!existingVendor) return handleResponse(resp,400,"This vendor is not exists in your list")
      
    const { start, end } = getFinancialYearRange();

    const stockEntries = await StockHistory.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean();
    const paymentEntries = await Payment.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean();

    const normalizedStock = stockEntries.map(e => ({
        date: e.date,
        description:e.type.toUpperCase()+(e.message?": "+e.message:" "),
        debit: ['stock_in', 'debit_note'].includes(e.type) ? e.totalAmount : 0,
        credit: ['stock_return', 'credit_note'].includes(e.type) ? e.totalAmount : 0,
        type: e.type,
    }));

    const normalizedPayments = paymentEntries.map(e => ({
        date: e.date,
        description: 'Payment'+(e.message?": "+e.message:"")+(" ("+e.method+")"),
        debit: 0,
        credit: e.amount,
        type: 'payment',
    }));
            
    const combined = [...normalizedStock, ...normalizedPayments].sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const ledger = combined.map(entry => {
        balance += (entry.debit || 0) - (entry.credit || 0);
        return { ...entry, balance };
    });
    if (ledger.length === 0) return handleResponse(resp, 400, "No records found for this period");    
    const result= await generateExcelReport(ledger,{name:existingVendor.name,balance:existingVendor.balance,title:`FY ${start.toLocaleDateString("en-GB",{year:"numeric"})}-${end.toLocaleDateString("en-GB",{year:"numeric"})}`});
    if(!result.status) return handleResponse(resp,400,result.message)
    resp.setHeader("Content-Disposition", `attachment; filename="${result.data.filename}"`);
    resp.status(202).download(result.data.outputPath,result.data.filename,error=>{
    if(error) return handleResponse(resp,400,"Could not download the file.")
    fs.unlink(result.data.outputPath,err=>{
      if(err) console.log("File deletion failed:"+err);
      else console.log("File deleted after sending!");})
    })
  } catch (error) {
    return handleError(resp,error)
  }
},
    pdf_current_month:async (req, resp) => {
  try {
    const { vendorId } = req.params;
    if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid vendor Id")

    const existingVendor = await Vendor.findOne({userId:req.user._id,_id:vendorId})
    if(!existingVendor) return handleResponse(resp,400,"This vendor is not exists in your list")
      
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stockEntries = await StockHistory.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: startOfMonth } }).sort({ date: 1 }).lean();
    const paymentEntries = await Payment.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: startOfMonth } }).sort({ date: 1 }).lean();

    const normalizedStock = stockEntries.map(e => ({
        date: e.date,
        description:e.type.toUpperCase()+(e.message?": "+e.message:" "),
        debit: ['stock_in', 'debit_note'].includes(e.type) ? e.totalAmount : 0,
        credit: ['stock_return', 'credit_note'].includes(e.type) ? e.totalAmount : 0,
        type: e.type,
    }));

    const normalizedPayments = paymentEntries.map(e => ({
        date: e.date,
        description: 'Payment'+(e.message?": "+e.message:"")+(" ("+e.method+")"),
        debit: 0,
        credit: e.amount,
        type: 'payment',
    }));
            
    const combined = [...normalizedStock, ...normalizedPayments].sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const ledger = combined.map(entry => {
        balance += (entry.debit || 0) - (entry.credit || 0);
        return { ...entry, balance };
    });
    if (ledger.length === 0) return handleResponse(resp, 400, "No records found for this period");    
    const filename = `${existingVendor.name}-ledger-${Date.now()}.pdf`;
    const resultingDir=path.join(__dirname,"..","..","..",'pdfs')
    if (!fs.existsSync(resultingDir)) {
    fs.mkdirSync(resultingDir, { recursive: true })
    }
    const outputPath = path.join(resultingDir, filename);
    const result= await convertPdf(ledger,{name:existingVendor.name,balance:existingVendor.balance,title:now.toLocaleDateString("en-GB",{month:"long",year:"numeric"})},outputPath);
    if(!result.status) return handleResponse(resp,400,result.message)
    resp.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    resp.status(202).download(outputPath,filename,error=>{
    if(error) return handleResponse(resp,400,"Could not download the file.")
    fs.unlink(outputPath,err=>{
      if(err) console.log("File deletion failed:"+err);
      else console.log("File deleted after sending!");})
    })
  } catch (error) {
    return handleError(resp,error)
  }
},
    pdf_financial_year:async (req, resp) => {
  try {
    const { vendorId } = req.params;
    if(!vendorId || !mongoose.isValidObjectId(vendorId)) return handleResponse(resp,400,"Invalid vendor Id")

    const existingVendor = await Vendor.findOne({userId:req.user._id,_id:vendorId})
    if(!existingVendor) return handleResponse(resp,400,"This vendor is not exists in your list")
      
    const { start, end } = getFinancialYearRange();

    const stockEntries = await StockHistory.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean();
    const paymentEntries = await Payment.find({userId:req.user._id, vendorId:existingVendor._id, date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean();

    const normalizedStock = stockEntries.map(e => ({
        date: e.date,
        description:e.type.toUpperCase()+(e.message?": "+e.message:" "),
        debit: ['stock_in', 'debit_note'].includes(e.type) ? e.totalAmount : 0,
        credit: ['stock_return', 'credit_note'].includes(e.type) ? e.totalAmount : 0,
        type: e.type,
    }));

    const normalizedPayments = paymentEntries.map(e => ({
        date: e.date,
        description: 'Payment'+(e.message?": "+e.message:"")+(" ("+e.method+")"),
        debit: 0,
        credit: e.amount,
        type: 'payment',
    }));
            
    const combined = [...normalizedStock, ...normalizedPayments].sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const ledger = combined.map(entry => {
        balance += (entry.debit || 0) - (entry.credit || 0);
        return { ...entry, balance };
    });
    if (ledger.length === 0) return handleResponse(resp, 400, "No records found for this period");    
    const filename = `${existingVendor.name}-ledger-${Date.now()}.pdf`;
    const resultingDir=path.join(__dirname,"..","..","..",'pdfs')
    if (!fs.existsSync(resultingDir)) {
    fs.mkdirSync(resultingDir, { recursive: true })
    }
    const outputPath = path.join(resultingDir, filename);
    const result= await convertPdf(ledger,{name:existingVendor.name,balance:existingVendor.balance,title:`FY ${start.toLocaleDateString("en-GB",{year:"numeric"})}-${end.toLocaleDateString("en-GB",{year:"numeric"})}`},outputPath);
    if(!result.status) return handleResponse(resp,400,result.message)
    resp.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    resp.status(202).download(outputPath,filename,error=>{
    if(error) return handleResponse(resp,400,"Could not download the file.")
    fs.unlink(outputPath,err=>{
      if(err) console.log("File deletion failed:"+err);
      else console.log("File deleted after sending!");})
    })
  } catch (error) {
    return handleError(resp,error)
  }
},
}
module.exports=FileController