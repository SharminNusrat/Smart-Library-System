const axios = require('axios')
const circuitBreaker = require('opossum')
const baseUserUrl = 'http://localhost:8081/api/users'
const baseBookUrl = 'http://localhost:8082/api/books'

const axiosInstance = axios.create({
    timeout: 3000, // 3s timeout
});

const fetchUser = async (userId) => {
    const response = await axiosInstance.get(`${baseUserUrl}/${userId}`)
    return response.data
}

const fetchBook = async (bookId) => {
    const response = await axiosInstance.get(`${baseBookUrl}/${bookId}`)
    return response.data
}

const updateAvailability = async (bookId, operation) => {
    await axiosInstance.patch(`${baseBookUrl}/${bookId}/availability`, {
        operation
    })
}

const fetchBookCounts = async () => {
    const response = await axiosInstance.get(`${baseBookUrl}/counts`)
    return response.data
}

const fetchUserCounts = async () => {
    const response = await axiosInstance.get(`${baseUserUrl}/counts`)
    return response.data
}

const breakerOptions = {
    timeout: 4000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000
}

const userBreaker = new circuitBreaker(fetchUser, breakerOptions)
const bookBreaker = new circuitBreaker(fetchBook, breakerOptions)
const bookAvailabilityBreaker = new circuitBreaker(updateAvailability, breakerOptions)
const bookCountsBreaker = new circuitBreaker(fetchBookCounts, breakerOptions)
const userCountsBreaker = new circuitBreaker(fetchUserCounts, breakerOptions)

const getUserById = (userId) => userBreaker.fire(userId)
const getBookById = (bookId) => bookBreaker.fire(bookId)
const updateBookAvailability = (bookId, operation) => bookAvailabilityBreaker.fire(bookId, operation)
const getBookCounts = () => bookCountsBreaker.fire()
const getUserCounts = () => userCountsBreaker.fire()

module.exports = {
    getUserById,
    getBookById,
    updateBookAvailability,
    getBookCounts,
    getUserCounts
}