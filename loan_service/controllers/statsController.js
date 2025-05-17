const {getBookById, getUserById, getBookCounts, getUserCounts} = require('../services/externalServices')
const Loan = require('../models/Loan')

const getPopularBooks = async (req, res) => {
    try {
        const stats = await Loan.getPopularBookStats();
        const enriched = await Promise.all(stats.map(async (b) => {
            let book = { id: b.book_id };
            try {
                const bookData = await getBookById(b.book_id);
                book.title = bookData.title;
                book.author = bookData.author;
            } catch (e) {}
            return { book, borrow_count: b.borrow_count };
        }));
        res.status(200).json(enriched);
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch popular books' });
    }
};

const getActiveUsers = async (req, res) => {
    try {
        const stats = await Loan.getActiveUserStats();
        const enriched = await Promise.all(stats.map(async (u) => {
            let user = { id: u.user_id };
            try {
                const userData = await getUserById(u.user_id);
                user.name = userData.name;
                user.email = userData.email;
            } catch (e) {}
            return { user, books_borrowed: u.books_borrowed };
        }));
        res.status(200).json(enriched);
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch active users' });
    }
};

const getSystemOverview = async (req, res) => {
    try {
        console.log('hiii from overview')
        const [userCountResponse, bookCountsResponse, loanStats] = await Promise.all([
            getUserCounts().catch(e => {
                console.error('Error fetching user counts:', e);
                return null;
            }),
            getBookCounts().catch(e => {
                console.error('Error fetching book counts:', e);
                return null;
            }),
            Loan.getCurrentStats().catch(e => {
                console.error('Error fetching loan stats:', e);
                return null;
            })
        ]);

        let total_users = 0;
        console.log(userCountResponse)
        if (userCountResponse && userCountResponse.total_users) {
            total_users = userCountResponse.total_users;
        }

        let total_books = 0;
        let books_available = 0;
        if (bookCountsResponse && bookCountsResponse.total_books) {
            total_books = bookCountsResponse.total_books;
            console.log(bookCountsResponse)
            books_available = bookCountsResponse.books_available;
        }

        const defaultLoanStats = {
            books_borrowed: 0,
            overdue_loans: 0,
            loans_today: 0,
            returns_today: 0
        };
        const finalLoanStats = loanStats || defaultLoanStats;

        const overview = {
            total_users,
            total_books,
            books_available,
            books_borrowed: finalLoanStats.books_borrowed || 0,
            overdue_loans: finalLoanStats.overdue_loans || 0,
            loans_today: finalLoanStats.loans_today || 0,
            returns_today: finalLoanStats.returns_today || 0
        };

        return res.status(200).json({
            status: 'success',
            data: overview
        });

    } catch (err) {
        console.error('Error in getSystemOverview:', err);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch system overview' 
        });
    }
};

module.exports = {
    getPopularBooks,
    getActiveUsers,
    getSystemOverview
}