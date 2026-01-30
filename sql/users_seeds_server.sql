CREATE TABLE `users_seeds_server` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `seed` varchar(256) NOT NULL,
    `nonce` bigint(32) NOT NULL DEFAULT 0,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;