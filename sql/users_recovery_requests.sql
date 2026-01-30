CREATE TABLE `users_recovery_requests` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `used` bigint(32) NOT NULL DEFAULT 0,
    `email` text NOT NULL,
    `token` varchar(32) NOT NULL,
    `expire` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;