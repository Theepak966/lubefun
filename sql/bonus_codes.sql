CREATE TABLE `bonus_codes` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `userid` varchar(36) NOT NULL,
    `code` varchar(256) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `uses` bigint(32) NOT NULL DEFAULT 0,
    `max_uses` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;