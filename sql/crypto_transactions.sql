CREATE TABLE `crypto_transactions` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `status` bigint(32) NOT NULL,
    `type` text NOT NULL,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `xp` bigint(32) NOT NULL,
    `transactionid` bigint(32) NOT NULL,
    `address` text NOT NULL,
    `currency` varchar(32) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `value` double NOT NULL,
    `paid` double NOT NULL DEFAULT 0,
    `exchange` decimal(32,5) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;