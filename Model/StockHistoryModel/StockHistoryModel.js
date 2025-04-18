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
        required:true,
    },
    subSubCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.CATEGORY_COLLECTION,
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
        type:String,
        required:true,
        enum:["Rate","Purchase","Return","Sale"]
    }
},{timestamps:true,discriminatorKey:"type",collection:process.env.STOCK_HISTORY_COLLECTION})
const StockHistory=mongoose.model(process.env.STOCK_HISTORY_COLLECTION,BaseSchema)

const RateSchema = new mongoose.Schema({
    quantity:{
        type:Number,
        default:0
    },
    cost:{
        type:Number,
        required:true
    },
    otherCharges:{
        type:Number,
        default:0
    },
    vendorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.VENDOR_COLLECTION,
        required:true,
    },
    vendorName:{
        type:String,
        required:true,
    }
})
const PurchaseSchema = new mongoose.Schema({
    quantity:{
        type:Number,
        required:true,
    },
    cost:{
        type:Number,
        required:true
    },
    otherCharges:{
        type:Number,
        default:0
    },
    vendorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.VENDOR_COLLECTION,
        required:true,
    }, 
    vendorName:{
        type:String,
        required:true,
    },
    returned:{
        type:Boolean,
        default:false
    }
})
const SaleSchema = new mongoose.Schema({
    quantity:{
        type:Number,
        required:true,
    }
})
const ReturnSchema = new mongoose.Schema({
    quantity:{
        type:Number,
        required:true,
    },
    cost:{
        type:Number,
        required:true
    },
    otherCharges:{
        type:Number,
        default:0
    },
    vendorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:process.env.VENDOR_COLLECTION,
        required:true,
    },
    vendorName:{
        type:String,
        required:true,
    }
})
const Rate = StockHistory.discriminator("Rate",RateSchema)
const Purchase = StockHistory.discriminator("Purchase",PurchaseSchema)
const Sale = StockHistory.discriminator("Sale",SaleSchema)
const Return = StockHistory.discriminator("Return",ReturnSchema)
module.exports={StockHistory,Rate,Purchase,Sale,Return}