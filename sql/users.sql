CREATE TABLE `users` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `bot` bigint(32) NOT NULL DEFAULT 0,
    `anonymous` bigint(32) NOT NULL DEFAULT 0,
    `private` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `email` text DEFAULT NULL,
    `password` varchar(256) DEFAULT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `rank` bigint(32) NOT NULL DEFAULT 0,
    `balance` decimal(32,5) NOT NULL DEFAULT 0.00000,
    `xp` bigint(32) NOT NULL DEFAULT 0,
    `rollover` decimal(32,2) NOT NULL DEFAULT 0.00,
    `exclusion` bigint(32) NOT NULL DEFAULT 0,
    `time_create` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;