CREATE TABLE `users_logins` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `type` text NOT NULL,
    `userid` varchar(36) NOT NULL,
    `sessionid` bigint(32) NOT NULL,
    `ip` text NOT NULL,
    `location` text NOT NULL,
    `agent` text NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;