CREATE TABLE `coinflip_winnings` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `gameid` bigint(32) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `position` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;