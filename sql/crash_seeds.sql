CREATE TABLE `crash_seeds` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `server_seed` varchar(256) NOT NULL,
    `public_seed` varchar(256) NOT NULL,
    `uses` bigint(32) NOT NULL DEFAULT 0,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;