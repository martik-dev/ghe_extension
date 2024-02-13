require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const {fetchData} = require('./Controllers/dataController')

app.use(express.json()) // validate request body
app.use(cors())

const PORT = process.env.PORT || 7000


app.post('/api/data',fetchData)

app.all('*', (_req,res)=> {
    return res.status(404).json({ message: 'Page Not Found!!'})
})

app.listen(PORT, function(){
    console.log(`Server is running on ${PORT} port`)
})