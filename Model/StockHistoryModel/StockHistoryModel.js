const mongoose = require("mongoose")
require("dotenv").config()
const BaseSchema= new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.MONGODB_USER_COLLECTION,
        required:true,
    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.PRODUCT_COLLECTION,
        required: function () {
        return this.type !== 'credit_note' && this.type !== 'debit_note';
        }
    },
    vendorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.VENDOR_COLLECTION,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now
    },
    message:{
        type:String,
        default:null
    },
    type:{ 
        type: String, 
        enum: ['stock_in', 'stock_return', 'debit_note', 'credit_note'], 
        required: true,
    },
    quantity: { 
        type: Number,
        required: function () {
            return this.type === 'stock_in' || this.type === 'stock_return';
        }
    },
    costPerUnit: { type: Number },
    totalAmount: { type: Number, required: true },
    otherCharges: { type: Number, default: 0 },
    gst: {type:Number,required:true,enum:[0,5,12,18,28],default:0},
    gstCharges: { type: Number,required:true,default:0},
    vendorName: { type: String, required:true }
},{timestamps:true,discriminatorKey:"type",collection:process.env.STOCK_HISTORY_COLLECTION, toJSON: { virtuals: true },toObject: { virtuals: true }})
const StockHistory=mongoose.model(process.env.STOCK_HISTORY_COLLECTION,BaseSchema)

BaseSchema.virtual('returns', {
  ref: process.env.STOCK_HISTORY_COLLECTION,
  localField: '_id',
  foreignField: 'parentStockHistoryId'
});

const StockInSchema = new mongoose.Schema({ 
    
})
const StockReturnSchema = new mongoose.Schema({
   parentStockHistoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: process.env.STOCK_HISTORY_COLLECTION,
    required:true,
  },
})
const DebitSchema = new mongoose.Schema({
    
})
const CreditSchema = new mongoose.Schema({
    
})
const StockIn = StockHistory.discriminator("stock_in",StockInSchema)
const StockReturn = StockHistory.discriminator("stock_return",StockReturnSchema)
const Debit = StockHistory.discriminator("debit_note",DebitSchema)
const Credit = StockHistory.discriminator("credit_note",CreditSchema)
module.exports={StockHistory,StockIn,StockReturn,Debit,Credit}