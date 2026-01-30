CREATE TABLE `referral_codes` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `userid` varchar(36) NOT NULL,
    `code` varchar(256) NOT NULL,
    `collected` decimal(32,2) NOT NULL DEFAULT 0.00,
    `available` decimal(32,5) NOT NULL DEFAULT 0.00000,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;