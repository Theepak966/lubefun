CREATE TABLE `users_restrictions` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `restriction` varchar(256) NOT NULL,
    `reason` varchar(256) NOT NULL,
    `byuserid` varchar(36) NOT NULL,
    `expire` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;