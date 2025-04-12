const express=require("express")
const cors=require("cors")
const Connection=require("./Connection")
require("dotenv").config()
const Routes=require("./Routes/Route")
const app=express()
app.use(express.json())
app.use(cors())
app.use('/uploads', express.static('uploads'));
Connection()

app.use("/api",Routes)
app.listen(process.env.PORT || 3010,()=>console.log("Server Started At:"+process.env.PORT || 3010))
//mongodb+srv://anshbudhiraja72:6d2Aqbx1bAuKK5pC@cluster1.txszx.mongodb.net/ProjectDB?retryWrites=true&w=majority&appName=Cluster1