CREATE TABLE `chat_messages` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `deleted` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `rank` bigint(32) NOT NULL,
    `xp` bigint(32) NOT NULL,
    `private` bigint(32) NOT NULL,
    `message` text NOT NULL,
    `channel` varchar(32) NOT NULL,
    `reply` bigint(32) DEFAULT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;