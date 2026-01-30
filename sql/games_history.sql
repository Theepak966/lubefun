CREATE TABLE `games_history` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `visible` bigint(32) NOT NULL,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `xp` bigint(32) NOT NULL,
    `game` text NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `winning` decimal(32,2) NOT NULL,
    `multiplier` decimal(32,2) NOT NULL,
    `gameid` decimal(32,0) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;