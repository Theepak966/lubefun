CREATE TABLE `casino_winnings` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `betid` bigint(32) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;