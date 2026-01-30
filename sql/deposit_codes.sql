CREATE TABLE `deposit_codes` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `referral` varchar(36) NOT NULL,
    `code` varchar(256) NOT NULL,
    `uses` bigint(32) NOT NULL DEFAULT 0,
    `amount` decimal(32,5) NOT NULL DEFAULT 0.00000,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;