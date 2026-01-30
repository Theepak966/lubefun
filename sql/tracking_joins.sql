CREATE TABLE `tracking_joins` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `referral` varchar(256) NOT NULL,
    `ip` text NOT NULL,
    `location` text NOT NULL,
    `agent` text NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;