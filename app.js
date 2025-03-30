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
const HOST = '0.0.0.0'

app.use("/api",Routes)
app.listen(process.env.PORT || 3010,HOST,()=>console.log("Server Started At:"+process.env.PORT || 3010))
