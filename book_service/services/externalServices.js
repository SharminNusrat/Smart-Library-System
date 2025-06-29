const axios = require('axios')
const circuitBreaker = require('opossum')
const baseLoanUrl = 'http://loan-svc:8083/api/loans'
// const baseLoanUrl = 'http://localhost:8083/api/loans'

const axiosInstance = axios.create({
    timeout: 3000,
})

const bookHasActiveLoan = async (bookId) => {
    const response = await axiosInstance.get(`${baseLoanUrl}/book/${bookId}/check`)
    return response.data
}

const breakerOptions = {
    timeout: 4000,
    errorThresholdPercentage: 50,
    resetTime: 10000
}

const loanBreaker = new circuitBreaker(bookHasActiveLoan, breakerOptions)

const hasActiveLoan = (bookId) => loanBreaker.fire(bookId)

module.exports = {hasActiveLoan}