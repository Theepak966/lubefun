CREATE TABLE `coinflip_bets` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `xp` bigint(32) NOT NULL,
    `bot` bigint(32) NOT NULL,
    `gameid` bigint(32) NOT NULL,
    `position` bigint(32) NOT NULL,
    `creator` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;