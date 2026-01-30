CREATE TABLE `rain_history` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `ended` bigint(32) NOT NULL DEFAULT 0,
    `amount` decimal(32,2) NOT NULL,
    `finish` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;