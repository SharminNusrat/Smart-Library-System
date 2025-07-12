-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jul 12, 2025 at 02:11 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smart_library_book_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

CREATE TABLE `books` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(100) NOT NULL,
  `isbn` varchar(20) NOT NULL,
  `copies` int(11) NOT NULL,
  `available_copies` int(11) NOT NULL,
  `status` enum('available','unavailable') NOT NULL,
  `genre` varchar(50) NOT NULL,
  `published_year` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `books`
--

INSERT INTO `books` (`id`, `title`, `author`, `isbn`, `copies`, `available_copies`, `status`, `genre`, `published_year`, `created_at`, `updated_at`) VALUES
(1, 'Clean Architecture', 'Robert C. Martin', '9780134494166', 5, 5, 'available', 'Software Engineering', '2017', '2025-05-14 00:29:24', '2025-06-28 16:33:36'),
(2, 'The Kite Runner', 'Khaled Hosseini', '9781594631931', 7, 6, 'available', 'Fiction', '2003', '2025-05-14 00:30:40', '2025-05-17 06:08:50'),
(3, 'Harry Potter and the Half Blood Prince', 'J.K. Rowling', '9780590353427', 10, 10, 'available', 'Fantasy', '2003', '2025-05-14 00:32:06', '2025-06-29 04:40:53'),
(4, 'Atomic Habits', 'James Clear', '9780735211292', 6, 6, 'available', 'Self-help', '2018', '2025-05-14 00:32:21', '2025-05-17 16:07:07');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `isbn` (`isbn`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `books`
--
ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
