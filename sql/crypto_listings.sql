CREATE TABLE `crypto_listings` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `canceled` bigint(32) NOT NULL DEFAULT 0,
    `confirmed` bigint(32) NOT NULL DEFAULT 0,
    `type` varchar(256) NOT NULL,
    `userid` varchar(36) NOT NULL,
    `address` text NOT NULL,
    `currency` varchar(32) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;