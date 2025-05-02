const express = require('express')
const app = express()
const db = require('./config/db-config')
const userRoutes = require('./routes/userRoutes')
const bookRoutes = require('./routes/bookRoutes')
const loanRoutes = require('./routes/loanRoutes')

const port = process.env.PORT || 8000
db.connect((err) => {
    if(err) {
        console.log(err)
    }
    else {
        console.log('MySQL Connected!')
    }
})

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/api/users', userRoutes)
app.use('/api/books', bookRoutes)
app.use('/api/loans', loanRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Library Management System!')
})

app.listen(port, (req, res) => {
    console.log(`Server is running at http://localhost:${port}`)
})