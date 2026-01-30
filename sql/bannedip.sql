CREATE TABLE `bannedip` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `ip` text NOT NULL,
    `userid` varchar(36) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;