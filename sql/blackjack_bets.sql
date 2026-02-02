CREATE TABLE `blackjack_bets` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `ended` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `xp` bigint(32) NOT NULL,
    `amount` decimal(32,2) NOT NULL,
    `winning` decimal(32,2) NOT NULL DEFAULT 0.00,
    `result` text DEFAULT NULL,
    `player` text NOT NULL,
    `dealer` text NOT NULL,
    `deck` text NOT NULL,
    `position` bigint(32) NOT NULL DEFAULT 0,
    `server_seedid` bigint(32) NOT NULL,
    `client_seedid` bigint(32) NOT NULL,
    `nonce` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;

