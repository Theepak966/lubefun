CREATE TABLE `coinflip_rolls` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `gameid` bigint(32) NOT NULL,
    `blockid` bigint(32) NOT NULL,
    `public_seed` varchar(256) NOT NULL,
    `roll` double NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;