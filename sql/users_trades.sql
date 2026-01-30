CREATE TABLE `users_trades` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `type` varchar(32) NOT NULL,
    `method` varchar(256) NOT NULL,
    `game` varchar(32) NOT NULL,
    `userid` varchar(36) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `value` double NOT NULL,
    `tradeid` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;