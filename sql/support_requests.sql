CREATE TABLE `support_requests` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `closed` bigint(32) NOT NULL DEFAULT 0,
    `status` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `name` varchar(256) NOT NULL,
    `avatar` text NOT NULL,
    `xp` bigint(32) NOT NULL,
    `subject` varchar(256) NOT NULL,
    `department` bigint(32) NOT NULL,
    `requestid` varchar(36) NOT NULL,
    `update` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;