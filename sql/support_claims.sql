CREATE TABLE `support_claims` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `ended` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `xp` bigint(32) NOT NULL,
    `requestid` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;