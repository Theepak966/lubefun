CREATE TABLE `join_visitors` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `link` text NOT NULL,
    `ip` text NOT NULL,
    `location` text NOT NULL,
    `agent` text NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;