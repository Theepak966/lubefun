CREATE TABLE `coinflip_games` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `canceled` bigint(32) NOT NULL DEFAULT 0,
    `ended` bigint(32) NOT NULL DEFAULT 0,
    `amount` decimal(32,2) NOT NULL,
    `server_seed` varchar(256) NOT NULL,
    `isBotFlip` tinyint(1) NOT NULL DEFAULT 0,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;