CREATE TABLE `users_transfers` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `from_userid` varchar(36) NOT NULL,
    `to_userid` varchar(36) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;