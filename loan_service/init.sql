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
-- Database: `smart_library_loan_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `loans`
--
create database if not exists `smart_library_loan_db`;
USE `smart_library_loan_db`;
CREATE TABLE `loans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `issue_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `due_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `return_date` timestamp NULL DEFAULT NULL,
  `status` enum('active','returned','overdue') NOT NULL,
  `extensions_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loans`
--

INSERT INTO `loans` (`id`, `user_id`, `book_id`, `issue_date`, `due_date`, `return_date`, `status`, `extensions_count`) VALUES
(4, 1, 3, '2025-05-16 19:01:08', '2025-05-20 18:00:00', '2025-05-16 19:13:16', 'returned', 0),
(5, 1, 2, '2025-05-17 06:08:50', '2025-05-20 18:00:00', NULL, 'active', 0),
(6, 1, 4, '2025-05-17 06:09:07', '2025-05-25 18:00:00', '2025-05-17 16:07:07', 'returned', 2),
(7, 1, 1, '2025-05-25 06:14:00', '2025-05-28 18:00:00', '2025-06-28 16:33:36', 'returned', 0),
(8, 1, 3, '2025-06-28 17:00:07', '2025-07-04 18:00:00', '2025-06-29 04:13:43', 'returned', 0),
(9, 1, 3, '2025-06-29 04:15:40', '2025-07-04 18:00:00', '2025-06-29 04:40:53', 'returned', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `loans`
--
ALTER TABLE `loans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
